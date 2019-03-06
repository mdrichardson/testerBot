import { BotAdapter, MemoryStorage, StatePropertyAccessor, TurnContext } from 'botbuilder';
import { BlobStorage, CosmosDbStorage } from 'botbuilder-azure';
import { ChoicePrompt, ComponentDialog, TextPrompt, WaterfallDialog, WaterfallStepContext } from 'botbuilder-dialogs';

const choices = {
    START: 'Start',
    CHECK: 'Check',
    CLOSE: 'Close',
};

const dialogIds = {
    PROACTIVE_MAIN: 'proactiveMainDialog',
    PROACTIVE_GET_ID: 'proactiveGetIdDialog',
};

const promptIds = {
    CHOICE: 'ChoicePrompt',
    TEXT: 'textPrompt',
};

const PROACTIVE_STORAGE_ID = 'proactiveIdList';

export class ProactiveDialog extends ComponentDialog {
    public adapter: BotAdapter;
    private myStorage: MemoryStorage|CosmosDbStorage|BlobStorage;

    constructor(dialogId: string, proactiveStateAccessor: StatePropertyAccessor<any>, adapter: BotAdapter, myStorage: MemoryStorage|CosmosDbStorage|BlobStorage) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) { throw new Error('Missing parameter.  dialogId is required'); }

        // Define main conversation flow
        this.addDialog(new WaterfallDialog(dialogIds.PROACTIVE_MAIN, [
            this.promptForOptionSelection.bind(this),
            this.executeAppropriateAction.bind(this),
            this.end.bind(this),
        ]));

        this.addDialog(new WaterfallDialog(dialogIds.PROACTIVE_GET_ID, [
            this.getId.bind(this),
            this.close.bind(this),
            this.end.bind(this),
        ]));

        // define dialogs to be used
        this.addDialog(new ChoicePrompt(promptIds.CHOICE));
        this.addDialog(new TextPrompt(promptIds.TEXT));

        this.adapter = adapter;

        this.myStorage = myStorage;
    }

    // Ask the user what they'd like to test and then load the appropriate dialogs for that
    private promptForOptionSelection = async (step: WaterfallStepContext) => {
        // Display prompt
        return await step.prompt(promptIds.CHOICE, {
            choices: Object.keys(choices).map((key) => choices[key]),
            prompt: 'What part of [Proactive Messaging] would you like to test?',
            retryPrompt: 'I didn\'t understand that. Please click an option',
        });
    }

    private executeAppropriateAction = async (step: WaterfallStepContext) => {
        switch (step.result.value) {
            case choices.START:
                return await this.startProactive(step);
            case choices.CHECK:
                return await this.checkProactive(step);
            case choices.CLOSE:
                return await step.replaceDialog(dialogIds.PROACTIVE_GET_ID);
            default:
                return await step.endDialog();
        }
    }

    private startProactive = async (step: WaterfallStepContext) => {
        // Generate random string
        let id = '';
        let randomAscii;
        for (let i = 0; i < 5; i++) {
            randomAscii = Math.floor((Math.random() * 25) + 97);
            id += String.fromCharCode(randomAscii);
        }

        const idsList = await this.myStorage.read[PROACTIVE_STORAGE_ID] || {};
        await step.context.sendActivity(`Creating ID #: ${id}`);
        // tslint:disable-next-line:no-string-literal
        const reference = step.options['reference'];
        idsList[id] = { completed: false, reference };
        try {
            const changes = {};
            const toSave = {
                list: idsList,
                eTag: '*',
            };
            changes[PROACTIVE_STORAGE_ID] = toSave;
            await this.myStorage.write(changes);
            return await step.context.sendActivity(`Successfully wrote ID: ${id} to storage`);
        } catch (err) {
            return await step.context.sendActivity(`Failed to save id to storage`);
        }
    }

    private checkProactive = async (step: WaterfallStepContext) => {
        // tslint:disable-next-line:no-string-literal
        const storage = await this.myStorage.read([PROACTIVE_STORAGE_ID]);
        const ids = storage[PROACTIVE_STORAGE_ID].list;
        if (Object.keys(ids).length) {
            return await step.context.sendActivity(
                `| ID &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Reference &nbsp;&nbsp; | Completed | \n` +
                `| :--- | :---: | :---: | \n` +
                Object.keys(ids).map((id) => {
                    return `${id} &nbsp; | ${ids[id].reference.conversation.id.split('|')[0]} &nbsp; | ${ids[id].completed}`;
                }).join('\n'));
        } else {
            await step.context.sendActivity(`There are no active ids in storage`);
        }
    }

    private getId = async (step: WaterfallStepContext) => {
        return await step.prompt(promptIds.TEXT, `Enter the proactive ID to close`);
    }

    private close = async (step: WaterfallStepContext) => {
        const id = step.result;
        const storage = await this.myStorage.read([PROACTIVE_STORAGE_ID]);
        const idsList = storage[PROACTIVE_STORAGE_ID].list;

        const idInfo = idsList[id] || undefined;

        if (!idInfo) {
            await step.context.sendActivity(`Sorry. Nothing in storage with ID: ${id}. Try again.`);
            return await step.replaceDialog(dialogIds.PROACTIVE_GET_ID);
        } else {
            if (idInfo.reference && !idInfo.completed) {
                // Send the proactive message to the user who created the id, using the adapter
                await this.adapter.continueConversation(idInfo.reference, async (proactiveTurnContext: TurnContext) => {
                    idInfo.completed = true;
                    idsList[id] = idInfo;
                    const changes = {};
                    const toSave = {
                        list: idsList,
                        eTag: '*',
                    };
                    changes[PROACTIVE_STORAGE_ID] = toSave;
                    await this.myStorage.write(changes);
                    await proactiveTurnContext.sendActivity(`Job completed: ${id}`);
                });

                await step.context.sendActivity(`ID closed. Notification sent.`);
            } else if (idInfo.completed) {
                await step.context.sendActivity(`This id is already completed. Please create a new one.`);
            }
        }
        return await step.next();
    }

    private end = async (step: WaterfallStepContext) => {
        return await step.beginDialog(dialogIds.PROACTIVE_MAIN);
    }
}
