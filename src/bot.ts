// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    ActivityTypes,
    BotAdapter,
    ConversationState,
    MemoryStorage,
    RecognizerResult,
    StatePropertyAccessor,
    TurnContext,
    UserState } from 'botbuilder';
import { LuisRecognizer, QnAMakerEndpoint } from 'botbuilder-ai';
import { BlobStorage, CosmosDbStorage } from 'botbuilder-azure';
import { DialogContext, DialogSet, DialogState, DialogTurnResult, DialogTurnStatus } from 'botbuilder-dialogs';
import { BotConfiguration, LuisService } from 'botframework-config';

import { LuisDialog } from './dialogs/luis';
import { TestingDialog } from './dialogs/testing';

// State Accessor Properties
const DIALOG_STATE_PROPERTY = 'dialogStatePropertyAccessor';

// this is the LUIS NAME entry in the .bot file.
const LUIS_CONFIGURATION = 'v-micricTester';

const LUIS_INTENTS = {
    CANCEL: 'Utilities_Cancel',
    HELP: 'Utilities_Help',
};

// Dialog IDs
const TESTING_DIALOG_ID = 'testingOptions';

export class TesterBot {
    private readonly dialogs: DialogSet;
    private luisRecognizer: LuisRecognizer;
    private dialogState: StatePropertyAccessor<DialogState>;
    private conversationState: ConversationState;
    private userState: UserState;
    private proactiveId: string;

    constructor(
        conversationState: ConversationState,
        userState: UserState,
        botConfig: BotConfiguration,
        adapter: BotAdapter,
        myStorage: MemoryStorage|CosmosDbStorage|BlobStorage,
        qnaEndpointSettings: QnAMakerEndpoint) {

        // add the LUIS recognizer
        let luisConfig: LuisService;
        luisConfig = botConfig.findServiceByNameOrId(LUIS_CONFIGURATION) as LuisService;
        if (!luisConfig || !luisConfig.appId) { throw new Error('Missing LUIS config. Please add to .bot file.'); }
        this.luisRecognizer = new LuisRecognizer({
            applicationId: luisConfig.appId,
            endpoint: luisConfig.getEndpoint(),
            endpointKey: luisConfig.subscriptionKey,
        });

        // Create the property accessors for user and conversation state for each storage method
        this.dialogState = conversationState.createProperty(DIALOG_STATE_PROPERTY);

        // Create top-level dialog(s)
        this.dialogs = new DialogSet(this.dialogState)
            .add(new TestingDialog(TESTING_DIALOG_ID, adapter, myStorage, qnaEndpointSettings))
            .add(new LuisDialog('luisDialog'));

        this.conversationState = conversationState;
        this.userState = userState;

        // Generate random string for proactive storage ID
        let id = '';
        let randomAscii;
        for (let i = 0; i < 5; i++) {
            randomAscii = Math.floor((Math.random() * 25) + 97);
            id += String.fromCharCode(randomAscii);
        }

        this.proactiveId = id;
    }

    public onTurn = async (context: TurnContext) => {

        const luisDialogIdSubstring = 'luis';

        const dc = await this.dialogs.createContext(context);

        if (context.activity.type === ActivityTypes.Message) {
            let dialogResult: DialogTurnResult;
            let luisResults: RecognizerResult;
            luisResults = await this.luisRecognizer.recognize(context);
            let topIntent;
            // Perform a call to LUIS to retreive results for the current activity message (if in appropriate dialog by id substring)
            if (dc.activeDialog && dc.activeDialog.id.includes(luisDialogIdSubstring)) {
                luisResults = await this.luisRecognizer.recognize(context);
                topIntent = LuisRecognizer.topIntent(luisResults);
            } else {
                luisResults = null;
                topIntent = 'None';
            }
            // Based on LUIS topIntent, evaluate if we have an interruption.
            // Interruption here refers to user looking for help/ cancel existing dialog
            const interrupted = await this.isTurnInterrupted(dc, luisResults);
            if (interrupted) {
                if (dc.activeDialog !== undefined) {
                    // issue a re-prompt on the active dialog
                    await dc.repromptDialog();
                } else {
                    // delete all of the dialogs and begin again with Testing Dialog
                    await dc.cancelAllDialogs();
                    await dc.beginDialog(TESTING_DIALOG_ID);
                }
            } else {
                // No interruption
                // Display any information sent by the user sent through a postback, which is normally hidden, for debugging purposes
                if (dc.context.activity.type === 'message' && dc.context.activity.channelData.postback) {
                    const postBackData = dc.context.activity.value || dc.context.activity.text;
                    dc.context.sendActivity(`You sent this input, which is normally hidden:\n${JSON.stringify(postBackData)}`);
                }
                // Continue any active dialogs, checking first if we need to send results to LUIS dialog test
                if (topIntent === 'beerPreference' && luisResults.intents.beerPreference.score >= 0.75) {
                    await dc.replaceDialog('luisDialog', luisResults);
                } else {
                    dialogResult = await dc.continueDialog();
                }
            }

            // If no active dialog or no active dialog has responded
            if (!dc.context.responded && dialogResult.status) {
                // Switch on return results from an active dialog
                switch (dialogResult.status) {
                    // no active dialogs
                    case DialogTurnStatus.empty:
                        // Determine what to do with LUIS intents
                        switch (topIntent) {
                            default:
                                // Let the user know we didn't recognize their intent
                                await dc.context.sendActivity(`I don't understand and neither does LUIS.`);
                                break;
                        }
                        break;
                    case DialogTurnStatus.waiting:
                    case DialogTurnStatus.complete:
                    default:
                        // Unrecognized status from child dialog. Cancel all dialogs.
                        await dc.cancelAllDialogs();
                        break;
                }
            }
        } else if (context.activity.type === ActivityTypes.ConversationUpdate) {
            // Do we have any new members added to the conversation?
            if (context.activity.membersAdded.length !== 0) {
                // Iterate over all new members added to the conversation
                for (const idx in context.activity.membersAdded) {
                    // Greet anyone that was not the target (recipient) of this message
                    if (context.activity.membersAdded[idx].id !== context.activity.recipient.id) {
                        // Welcome the user with information about themself
                        const userInfo = `` +
                            `&nbsp;&nbsp;**Username:** ${context.activity.membersAdded[0].name}\n` +
                            `&nbsp;&nbsp;**ID:** ${context.activity.membersAdded[0].id}\n` +
                            `&nbsp;&nbsp;**Channel:** ${context.activity.channelId}\n` +
                            `&nbsp;&nbsp;**Locale:** ${context.activity.locale || 'None'}\n` +
                            `&nbsp;&nbsp;**Conversastion ID:** ${context.activity.conversation.id}\n` +
                            `&nbsp;&nbsp;**Service URL:** ${context.activity.serviceUrl}`;
                        await context.sendActivity(`**Welcome!** Here\'s what I know about you:\n${userInfo}`);
                        const reference = TurnContext.getConversationReference(context.activity);
                        await dc.replaceDialog(TESTING_DIALOG_ID, { proactiveId: this.proactiveId, reference });
                    }
                }
            }
        }

        // make sure to persist state at the end of a turn.
        await this.conversationState.saveChanges(context);
        await this.userState.saveChanges(context);
    }

    // Check if LUIS needs to interrupt current dialog
    private isTurnInterrupted = async (dc: DialogContext, luisResults: RecognizerResult) => {
        const topIntent = LuisRecognizer.topIntent(luisResults);

        // see if there are any conversation interrupts we need to handle
        switch (topIntent) {
            case LUIS_INTENTS.CANCEL:
                await dc.context.sendActivity(`CANCEL INTERRUPTION.\nCancelling active dialogs...`);
                return true;
            case LUIS_INTENTS.HELP:
                await dc.context.sendActivity(`HELP INTERRUPTION.\n**Click on one of the buttons, dummy.**`);
                return true;
            default:
                return false; // is not interrupted
        }
    }
}
