import { BotAdapter, MemoryStorage, StatePropertyAccessor, TurnContext } from 'botbuilder';
import { ChoicePrompt, ComponentDialog, WaterfallDialog, WaterfallStepContext } from 'botbuilder-dialogs';
import { UserProfile } from '../user/userProfile';

import { BlobStorage, CosmosDbStorage } from 'botbuilder-azure';
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
export class TestingDialog extends ComponentDialog {

    private userProfileAccessor: StatePropertyAccessor<UserProfile>;

    constructor(dialogId: string,
                userProfileAccessor: StatePropertyAccessor<UserProfile>,
                proactiveStateAccessor: StatePropertyAccessor<any>,
                adapter: BotAdapter,
                myStorage: MemoryStorage|CosmosDbStorage|BlobStorage) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) { throw new Error('Missing parameter.  dialogId is required'); }
        if (!userProfileAccessor) { throw new Error('Missing parameter.  userProfileAccessor is required'); }

        // Save off our state accessor for later use
        this.userProfileAccessor = userProfileAccessor;

        // Define conversation flow
        this.addDialog(new WaterfallDialog<UserProfile>(dialogIds.TESTS_MAIN, [
            this.initializeStateStep.bind(this),
            this.promptForTesting.bind(this),
            this.createAppropriateWaterfall.bind(this),
            this.restart.bind(this),
        ]));

        // define dialogs to be used
        this.addDialog(new ChoicePrompt('choicePrompt'));
        this.addDialog(new PromptsDialog(dialogIds.PROMPTS_DIALOG));
        this.addDialog(new RichCardsDialog(dialogIds.RICH_CARDS_DIALOG));
        this.addDialog(new ProactiveDialog(dialogIds.PROACTIVE_DIALOG, adapter, myStorage));
        this.addDialog(new LuisDialog(dialogIds.LUIS_DIALOG));
    }

    /**
     * Waterfall Dialog step functions.
     *
     * Initialize our state.  See if the WaterfallDialog has state pass to it
     * If not, then just new up an empty UserProfile object
     *
     * @param {WaterfallStepContext} step contextual information for the current step being executed
     */
    private initializeStateStep = async (step: WaterfallStepContext<UserProfile>) => {
        const userProfile = await this.userProfileAccessor.get(step.context);
        if (userProfile === undefined) {
            await this.userProfileAccessor.set(step.context, new UserProfile());
        }
        return await step.next();
    }

    // Ask the user what they'd like to test and then load the appropriate dialogs for that
    private promptForTesting = async (step: WaterfallStepContext<UserProfile>) => {
        return await step.prompt('choicePrompt', {
            choices: Object.keys(choices).map((key) => choices[key]),
            prompt: 'What would you like to test?',
            retryPrompt: 'I didn\'t understand that. Please click an option',
        });
    }

    private createAppropriateWaterfall = async (step: WaterfallStepContext<UserProfile>) => {
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
        // tslint:disable-next-line:no-string-literal
        const reference = step.options['reference'];
        return await step.replaceDialog(dialogIds.TESTS_MAIN, { reference });
    }
}
