import { StatePropertyAccessor } from 'botbuilder';
import { ChoicePrompt, ComponentDialog, WaterfallDialog, WaterfallStepContext } from 'botbuilder-dialogs';
import { UserProfile } from '../user/userProfile';

import { IDialogIds } from './interfaces';

export class GeneralDialog extends ComponentDialog {

    private userProfileAccessor: StatePropertyAccessor<UserProfile>;
    private dialogIds: IDialogIds;

    constructor(dialogId: string, userProfileAccessor: StatePropertyAccessor<UserProfile>, dialogIds: IDialogIds) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) { throw new Error('Missing parameter.  dialogId is required'); }
        if (!userProfileAccessor) { throw new Error('Missing parameter.  userProfileAccessor is required'); }
        if (!dialogIds) { throw new Error('Missing parameter.  dialogIds is required'); }

        this.dialogIds = dialogIds;

        // Define conversation flow
        this.addDialog(new WaterfallDialog<UserProfile>('generalDialogs', [
            this.promptForOptionSelection.bind(this),
            this.conductTest.bind(this),
            this.restartAsNecessary.bind(this),
        ]));

        // define dialogs to be used
        this.addDialog(new ChoicePrompt('choicePrompt2'));

        // Save off our state accessor for later use
        this.userProfileAccessor = userProfileAccessor;
    }

    // Ask the user what they'd like to test and then load the appropriate dialogs for that
    private promptForOptionSelection = async (step: WaterfallStepContext<UserProfile>) => {
        return await step.prompt('choicePrompt2', {
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

    private conductTest = async (step: WaterfallStepContext<UserProfile>) => {
        const inputToDialogConverter = {
        };
        const toAdd = inputToDialogConverter[step.result.value];
        this.addDialog(toAdd);
        return await step.endDialog();
    }

    private restartAsNecessary = async (step: WaterfallStepContext<UserProfile>) => {
        const inputToDialogConverter = {
            'Prompts': 'promptsDialogSet',
            'Rich Cards': 'richCardsDialogSet',
            'Data Storage': 'dataStorageDialogSet',
            'Proactive Messages': 'proactiveMessagesDialogSet',
            'LUIS': 'luisDialogSet',
            'QnA Maker': 'qnaMakerDialogSet',
        };
        const toAdd = inputToDialogConverter[step.result.value];
        this.addDialog(toAdd);
        console.log('ok');
        step.next();
        // return await step.endDialog();
    }
}
