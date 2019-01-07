// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActivityTypes, ConversationState, RecognizerResult, StatePropertyAccessor, TurnContext, UserState } from 'botbuilder';
import { LuisRecognizer } from 'botbuilder-ai';
import { DialogContext, DialogSet, DialogState, DialogTurnResult, DialogTurnStatus } from 'botbuilder-dialogs';
import { BotConfiguration, LuisService } from 'botframework-config';

import { GeneralDialog } from './dialogs/general';
import { TestingDialog } from './dialogs/testing';
import { UserProfile } from './user/userProfile';

import { IDialogIds } from './dialogs/interfaces';

// State Accessor Properties
const DIALOG_STATE_PROPERTY = 'dialogStatePropertyAccessor';
const USER_PROFILE_PROPERTY = 'userProfilePropertyAccessor';

// this is the LUIS service type entry in the .bot file.
const LUIS_CONFIGURATION = 'v-micricMultiChannelTester-b557';

// Dialog IDs
const TESTING_DIALOG_ID = 'testingOptions';

export class MultiChannelBot {
    private readonly dialogs: DialogSet;
    private dialogState: StatePropertyAccessor<DialogState>;
    private luisRecognizer: LuisRecognizer;
    private userProfileAccessor: StatePropertyAccessor<UserProfile>;
    private conversationState: ConversationState;
    private userState: UserState;

    /**
     * Use onTurn to handle an incoming activity, received from a user, process it, and reply as needed
     *
     * @param {TurnContext} turnContext context object.
     * @param {BotConfiguration} botConfig contents of the .bot file
     */
    constructor(conversationState: ConversationState, userState: UserState, botConfig: BotConfiguration) {
        if (!userState) { throw new Error('Missing parameter.  userState is required'); }
        if (!botConfig) { throw new Error('Missing parameter.  botConfig is required'); }
        if (!botConfig) { throw new Error('Missing parameter.  botConfig is required'); }

        // add the LUIS recognizer
        let luisConfig: LuisService;
        luisConfig = botConfig.findServiceByNameOrId(LUIS_CONFIGURATION) as LuisService;
        if (!luisConfig || !luisConfig.appId) { throw new Error('Missing LUIS config. Please add to .bot file.'); }
        this.luisRecognizer = new LuisRecognizer({
            applicationId: luisConfig.appId,
            // CAUTION: Its better to assign and use a subscription key instead of authoring key here.
            endpoint: luisConfig.getEndpoint(),
            endpointKey: luisConfig.authoringKey,
        });

        // Create the property accessors for user and conversation state
        this.userProfileAccessor = userState.createProperty(USER_PROFILE_PROPERTY);
        this.dialogState = conversationState.createProperty(DIALOG_STATE_PROPERTY);

        // Create top-level dialog(s)
        this.dialogs = new DialogSet(this.dialogState)
            .add(new TestingDialog(TESTING_DIALOG_ID, this.userProfileAccessor))

        this.conversationState = conversationState;
        this.userState = userState;
    }

    /**
     * This is the main code that drives the bot. It does the following:
     * 1. Display a welcome message with information about the user
     * 2. Use LUIS to recognize intents for incoming user message
     * 3. Asks user what they'd like to test and displays appropriate converation paths
     */
    public onTurn = async (context: TurnContext) => {
        // Handle Message activity type, which is the main activity type for shown within a conversational interface
        // Message activities may contain text, speech, interactive cards, and binary or unknown attachments.
        // see https://aka.ms/about-bot-activity-message to learn more about the message and other activity types

        // Create a dialog context
        const dc = await this.dialogs.createContext(context);

        if (context.activity.type === ActivityTypes.Message) {
            let dialogResult: DialogTurnResult;

            // Perform a call to LUIS to retreive results for the current activity message
            const luisResults = await this.luisRecognizer.recognize(context);
            const topIntent = LuisRecognizer.topIntent(luisResults);

            // Update user profile with any entries captured by LUIS
            // This could be user responding with their name or city while we are in the middle of dialog,
            // or user saying something like 'i'm {userName}' while we have no active multi-turn dialog.
            await this.updateUserProfile(luisResults, context);

            // Based on LUIS topIntent, evaluate if we have an interruption.
            // Interruption here refers to user looking for help/ cancel existing dialog
            const interrupted = await this.isTurnInterrupted(dc, luisResults);
            if (interrupted) {
                if (dc.activeDialog !== undefined) {
                    // issue a re-prompt on the active dialog
                    await dc.repromptDialog();
                } // Else: we don't have an active dialog so we do nothing
            } else {
                // No interruption. Continue any active dialogs
                dialogResult = await dc.continueDialog();
            }

            // If no active dialog or no active dialog has responded
            if (!dc.context.responded) {
                // Switch on return results from an active dialog
                switch (dialogResult.status) {
                    // no active dialogs
                    case DialogTurnStatus.empty:
                        // Determine what to do with LUIS intents
                        // TODO: Add LUIS Intents
                        switch (topIntent) {
                            default:
                                // Let the user know we didn't recognize their intent
                                await dc.context.sendActivity(`I don't understand and neither does LUIS.`);
                                break;
                        }
                        break;
                        case DialogTurnStatus.waiting:
                        // The active dialog is waiting for a response from the user, so do nothing.
                        break;
                    case DialogTurnStatus.complete:
                        // All child dialogs have ended. so do nothing.
                        break;
                    default:
                        // Unrecognized status from child dialog. Cancel all dialogs.
                        await dc.cancelAllDialogs();
                        break;
                }
            }
        } else if (context.activity.type === ActivityTypes.ConversationUpdate) {
            // Handle ConversationUpdate activity type, which is used to indicates new members add to
            // the conversation.
            // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types
            // Do we have any new members added to the conversation?
            if (context.activity.membersAdded.length !== 0) {
                // Iterate over all new members added to the conversation
                for (const idx in context.activity.membersAdded) {
                    // Greet anyone that was not the target (recipient) of this message
                    // the 'bot' is the recipient for events from the channel,
                    // context.activity.membersAdded == context.activity.recipient.Id indicates the
                    // bot was added to the conversation.
                    if (context.activity.membersAdded[idx].id !== context.activity.recipient.id) {
                        // Welcome the user with information about themself
                        const userInfo = `
                            Username: ${context.activity.membersAdded[0].name},
                            ID: ${context.activity.membersAdded[0].id},
                            Channel: ${context.activity.channelId},
                            Locale: ${context.activity.locale},
                        `;
                        await context.sendActivity(`Welcome. Here\'s what I know about you:\n${userInfo}`);
                        await dc.beginDialog(TESTING_DIALOG_ID);
                    }
                }
            }
        }

        // make sure to persist state at the end of a turn.
        await this.conversationState.saveChanges(context);
        await this.userState.saveChanges(context);
    }

    /**
     * Look at the LUIS results and determine if we need to handle
     * an interruptions due to a Help or Cancel intent
     *
     * @param {dc} dc - dialog context
     * @param {LuisResults} luisResults - LUIS recognizer results
     */
    private isTurnInterrupted = async (dc: DialogContext, luisResults: RecognizerResult) => {
        const topIntent = LuisRecognizer.topIntent(luisResults);

        // see if there are any conversation interrupts we need to handle
        // TODO: Add LUIS interrupts
        switch (topIntent) {
            case 'INTERRUPT':
                if (dc.activeDialog) {
                    // cancel all active dialog (clean the stack)
                    await dc.cancelAllDialogs();
                    await dc.context.sendActivity(`Ok.  I've cancelled our last activity.`);
                } else {
                    await dc.context.sendActivity(`I don't have anything to cancel.`);
                }
                return true; // is interrupt
            default:
                return false; // is not interrupt
        }
    }

    /**
     * Helper function to update user profile with entities returned by LUIS.
     *
     * @param {LuisResults} luisResults - LUIS recognizer results
     * @param {TurnContext} context - TurnContext context
     */
    // TODO: Add LUIS entities -  See BasicBot for examples
    private updateUserProfile = async (luisResults: RecognizerResult, context: TurnContext) => {
        // Do we have any entities?
        if (Object.keys(luisResults.entities).length !== 1) {
            return true;
        }
    }
}
