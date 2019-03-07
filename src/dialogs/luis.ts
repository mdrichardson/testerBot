import { ChoicePrompt, ComponentDialog, TextPrompt, WaterfallDialog, WaterfallStepContext } from 'botbuilder-dialogs';

const choices = {
    INTENT: 'Intent/Entity',
    INTERRUPTION: 'Interruption',
};

const dialogIds = {
    LUIS_MAIN: 'luisMainDialog',
    LUIS_INTENT: 'luisIntentDialog',
    LUIS_INTERRUPTION: 'luisInterruptionDialog',
};

const promptIds = {
    CHOICE: 'ChoicePrompt',
    TEXT: 'textPrompt',
};

export class LuisDialog extends ComponentDialog {

    constructor(dialogId: string) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) { throw new Error('Missing parameter.  dialogId is required'); }

        // Define main conversation flow
        this.addDialog(new WaterfallDialog(dialogIds.LUIS_MAIN, [
            this.promptForOptionSelection.bind(this),
            this.executeAppropriateAction.bind(this),
            this.end.bind(this),
        ]));

        this.addDialog(new WaterfallDialog(dialogIds.LUIS_INTENT, [
            this.promptForIntent.bind(this),
            this.displayIntent.bind(this),
            this.end.bind(this),
        ]));

        // this.addDialog(new WaterfallDialog(dialogIds.LUIS_INTERRUPTION, [
        //     this.promptForInterruption.bind(this),
        //     this.sendIfNotInterrupted.bind(this),
        //     this.end.bind(this),
        // ]));

        // define dialogs to be used
        this.addDialog(new ChoicePrompt(promptIds.CHOICE));
        this.addDialog(new TextPrompt(promptIds.TEXT));
    }

    // Ask the user what they'd like to test and then load the appropriate dialogs for that
    private promptForOptionSelection = async (step: WaterfallStepContext) => {
        // tslint:disable-next-line:no-string-literal
        if (step.options['intents']) {
            return await step.replaceDialog(dialogIds.LUIS_INTENT, step.options);
        }
        // Display prompt
        return await step.prompt(promptIds.CHOICE, {
            choices: Object.keys(choices).map((key) => choices[key]),
            prompt: 'What part of [LUIS] would you like to test?',
            retryPrompt: 'I didn\'t understand that. Please click an option',
        });
    }

    private executeAppropriateAction = async (step: WaterfallStepContext) => {
        switch (step.result.value) {
            case choices.INTENT:
                return await step.replaceDialog(dialogIds.LUIS_INTENT);
            case choices.INTERRUPTION:
                return await step.replaceDialog(dialogIds.LUIS_INTERRUPTION);
            default:
                return await step.endDialog();
        }
    }

    private promptForIntent = async (step: WaterfallStepContext) => {
        // tslint:disable-next-line:no-string-literal
        if (step.options['intents']) {
            return await step.next();
        }
        return await step.prompt(promptIds.TEXT, {
            prompt: `Tell me your favorite beer style and I'll return the top intent and everything else from LUIS`,
        });
    }

    private displayIntent = async (step: WaterfallStepContext) => {
        // tslint:disable:no-string-literal
        if (step.options['entities']) {
            const entityName = Object.keys(step.options['entities']).filter((key) => key !== '$instance');
            const result = step.options['entities'][entityName[0]][0];
            await step.context.sendActivity(`Your Top Entity: ${entityName}: ${result}`);
            return await step.context.sendActivity(`Everything else:\n    ${JSON.stringify(step.options, null, 2)}`);
        } else {
            await step.context.sendActivity(`That didn't match an intent and entity.\n Try "I like IPAs"`);
            return await step.replaceDialog(dialogIds.LUIS_INTENT);
        }
    }

    private end = async (step: WaterfallStepContext) => {
        return await step.replaceDialog(dialogIds.LUIS_MAIN);
    }
}
