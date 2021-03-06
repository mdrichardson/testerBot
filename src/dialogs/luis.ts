import { RecognizerResult } from 'botbuilder-core';
import { ChoicePrompt, ComponentDialog, TextPrompt, WaterfallDialog, WaterfallStepContext } from 'botbuilder-dialogs';
import utilities from '../resources/utilities';

const choices = {
    INTENT: 'Intent/Entity',
    INTERRUPTION: 'Interruption',
    BACK: 'Back',
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

        this.addDialog(new WaterfallDialog(dialogIds.LUIS_INTERRUPTION, [
            this.promptForInterruption.bind(this),
            this.sendIfNotInterrupted.bind(this),
            this.end.bind(this),
        ]));

        // define dialogs to be used
        this.addDialog(new ChoicePrompt(promptIds.CHOICE));
        this.addDialog(new TextPrompt(promptIds.TEXT));
    }

    // Ask the user what they'd like to test and then load the appropriate dialogs for that
    private promptForOptionSelection = async (step: WaterfallStepContext) => {
        const options = step.options as Partial<RecognizerResult>;
        if (options.intents) {
            return await step.replaceDialog(dialogIds.LUIS_INTENT, options);
        }
        // Display prompt
        return await step.prompt(promptIds.CHOICE, utilities.getTestChoiceParams(choices, 'LUIS'));
    }

    private executeAppropriateAction = async (step: WaterfallStepContext) => {
        switch (step.result.value) {
            case choices.INTENT:
                return await step.replaceDialog(dialogIds.LUIS_INTENT);
            case choices.INTERRUPTION:
                return await step.replaceDialog(dialogIds.LUIS_INTERRUPTION);
            case choices.BACK:
            default:
                return await step.replaceDialog(utilities.getTestingDialogId());
        }
    }

    private promptForIntent = async (step: WaterfallStepContext) => {
        utilities.beginTestPrint('LUIS Intents/Entities');
        const options = step.options as Partial<RecognizerResult>;
        if (options.intents) {
            return await step.next();
        }
        return await step.prompt(promptIds.TEXT, {
            prompt: `Tell me your favorite beer style and I'll return the top intent and everything else from LUIS`,
        });
    }

    private displayIntent = async (step: WaterfallStepContext) => {
        const options = step.options as Partial<RecognizerResult>;
        if (options.entities) {
            const entityName = Object.keys(options.entities).filter((key) => key !== '$instance') || '**No Entity Found**';
            let result;
            try {
                result = options.entities[entityName[0]][0];
            } catch (err) {
                result = 'No Entity Found';
            }
            await step.context.sendActivity(`Your Top Entity: ${entityName}: ${result}`);
            await step.context.sendActivity(`Everything else:\n    ${JSON.stringify(options, null, 2)}`);
        } else {
            await step.context.sendActivity(`That didn't match an intent and entity.\n Try "I like IPAs"`);
            await step.replaceDialog(dialogIds.LUIS_INTENT);
        }
        utilities.endTestPrint('LUIS Intents/Entities');
        return await step.next();
    }

    private promptForInterruption = async (step: WaterfallStepContext) => {
        utilities.beginTestPrint('LUIS Interruption');
        return await step.prompt(promptIds.TEXT, {
            prompt: `Say "help" or "cancel" to interrupt.\nIf it works, the bot will notify you of the interrupt`,
        });
    }

    private sendIfNotInterrupted = async (step: WaterfallStepContext) => {
        utilities.endTestPrint('FAILED LUIS Interruption');
        return await step.context.sendActivity(`You said: ${step.result}.\nYou shouldn't have seen this message if the interrupt was triggered correctly.`);
    }

    private end = async (step: WaterfallStepContext) => {
        utilities.endTestPrint('LUIS');
        return await step.beginDialog(dialogIds.LUIS_MAIN);
    }
}
