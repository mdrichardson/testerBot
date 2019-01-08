import { StatePropertyAccessor } from 'botbuilder';
import { ChoicePrompt, ComponentDialog, WaterfallDialog, WaterfallStepContext } from 'botbuilder-dialogs';
import { UserProfile } from '../user/userProfile';

import { EchosDialog } from './echos';
import { IDialogIds } from './interfaces';

const dialogIds: IDialogIds = {
    ECHOS_DIALOG_ID: 'echosDialogs',
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
        this.addDialog(new WaterfallDialog<UserProfile>('testDialogs', [
            this.initializeStateStep.bind(this),
            this.promptForTesting.bind(this),
            this.createAppropriateWaterfall.bind(this),
        ]));

        // define dialogs to be used
        this.addDialog(new ChoicePrompt('choicePrompt'));
        this.addDialog(new EchosDialog(dialogIds.ECHOS_DIALOG_ID));
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
        const choices = [
            'Echos',
            'Prompts',
            'Rich Cards',
            'Data Storage',
            'Proactive Messages',
            'LUIS',
            'QnA Maker',
        ];
        // Remove choices that have already been fully tested (in case user restarts dialog)
        const userProfile = await this.userProfileAccessor.get(step.context);
        const alreadyChosen = userProfile.testsExecuted;
        const displayedChoices = choices.filter((c) => alreadyChosen.indexOf(c) === -1);

        return await step.prompt('choicePrompt', {
            choices: displayedChoices,
            prompt: 'What would you like to test?',
            retryPrompt: 'I didn\'t understand that. Please click an option',
        });
    }

    private createAppropriateWaterfall = async (step: WaterfallStepContext<UserProfile>) => {
        return await step.beginDialog(dialogIds.ECHOS_DIALOG_ID);
    }
}
