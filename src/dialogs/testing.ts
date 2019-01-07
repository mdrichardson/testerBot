import { StatePropertyAccessor } from 'botbuilder';
import { ChoicePrompt, ComponentDialog, WaterfallDialog, WaterfallStepContext } from 'botbuilder-dialogs';
import { UserProfile } from '../user/userProfile';

import { GeneralDialog } from './general';
import { IDialogIds } from './interfaces';

const dialogIds: IDialogIds = {
    GENERAL_DIALOG_ID: 'generalDialogs',
};
export class TestingDialog extends ComponentDialog {

    private userProfileAccessor: StatePropertyAccessor<UserProfile>;

    constructor(dialogId: string, userProfileAccessor: StatePropertyAccessor<UserProfile>) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) { throw new Error('Missing parameter.  dialogId is required'); }
        if (!userProfileAccessor) { throw new Error('Missing parameter.  userProfileAccessor is required'); }

        // Save off our state accessor for later use
        this.userProfileAccessor = userProfileAccessor;

        // Define conversation flow
        this.addDialog(new WaterfallDialog<UserProfile>('test', [
            this.initializeStateStep.bind(this),
            this.promptForTesting.bind(this),
            this.createAppropriateWaterfall.bind(this),
        ]));

        // define dialogs to be used
        this.addDialog(new ChoicePrompt('choicePrompt'));
        this.addDialog(new GeneralDialog(dialogIds.GENERAL_DIALOG_ID, this.userProfileAccessor, dialogIds));
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
            prompt: 'What would you like to test?',
            retryPrompt: 'I didn\'t understand that. Please click an option',
            /* tslint:disable:object-literal-sort-keys */
            choices: [
                'General',
                'Prompts',
                'Rich Cards',
                'Data Storage',
                'Proactive Messages',
                'LUIS',
                'QnA Maker',
            ],
        });
    }

    private createAppropriateWaterfall = async (step: WaterfallStepContext<UserProfile>) => {
        step.beginDialog(dialogIds.GENERAL_DIALOG_ID);
        console.log('ok');
        return await step.endDialog();
    }
}
