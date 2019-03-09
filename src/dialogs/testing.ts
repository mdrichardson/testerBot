import { BotAdapter, MemoryStorage } from 'botbuilder';
import { BlobStorage, CosmosDbStorage } from 'botbuilder-azure';
import { ChoicePrompt, ComponentDialog, WaterfallDialog, WaterfallStepContext } from 'botbuilder-dialogs';

import utilities from '../resources/utilities';
import { LuisDialog } from './luis';
import { ProactiveDialog } from './proactive';
import { PromptsDialog } from './prompts';
import { RichCardsDialog } from './richCards';

const dialogIds = {
    TESTS_MAIN: 'testsDialog',
    PROMPTS_DIALOG: 'promptsDialog',
    RICH_CARDS_DIALOG: 'richCardsDialog',
    PROACTIVE_DIALOG: 'proactiveDialog',
    LUIS_DIALOG: 'luisDialog',
};

const choices = {
    prompts: 'Prompts',
    richCards: 'Rich Cards',
    proactive: 'Proactive Messages',
    luis: 'LUIS',
    qnaMaker: 'QnA Maker',
};

const promptIds = {
    CHOICE: 'choicePrompt',
};
export class TestingDialog extends ComponentDialog {

    constructor(dialogId: string,
                adapter: BotAdapter,
                myStorage: MemoryStorage|CosmosDbStorage|BlobStorage) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) { throw new Error('Missing parameter.  dialogId is required'); }

        // Define conversation flow
        this.addDialog(new WaterfallDialog(dialogIds.TESTS_MAIN, [
            this.promptForTesting.bind(this),
            this.createAppropriateWaterfall.bind(this),
            this.restart.bind(this),
        ]));

        // define dialogs to be used
        this.addDialog(new ChoicePrompt(promptIds.CHOICE));
        this.addDialog(new PromptsDialog(dialogIds.PROMPTS_DIALOG));
        this.addDialog(new RichCardsDialog(dialogIds.RICH_CARDS_DIALOG));
        this.addDialog(new ProactiveDialog(dialogIds.PROACTIVE_DIALOG, adapter, myStorage));
        this.addDialog(new LuisDialog(dialogIds.LUIS_DIALOG));
    }

    // Ask the user what they'd like to test and then load the appropriate dialogs for that
    private promptForTesting = async (step: WaterfallStepContext) => {
        return await step.prompt(promptIds.CHOICE, utilities.getTestChoiceParams(choices, 'Main Test'));
    }

    private createAppropriateWaterfall = async (step: WaterfallStepContext) => {
        switch (step.result.value) {
            case choices.prompts:
                return await step.replaceDialog(dialogIds.PROMPTS_DIALOG);
            case choices.richCards:
                return await step.replaceDialog(dialogIds.RICH_CARDS_DIALOG);
            case choices.proactive:
                return await step.replaceDialog(dialogIds.PROACTIVE_DIALOG, step.options);
            case choices.luis:
                return await step.replaceDialog(dialogIds.LUIS_DIALOG, step.options);
            default:
                return await step.endDialog();
        }
    }

    private restart = async (step: WaterfallStepContext) => {
        utilities.endTestPrint('Main Testing');
        return await step.replaceDialog(dialogIds.TESTS_MAIN, step.options);
    }
}
