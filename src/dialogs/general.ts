import { StatePropertyAccessor } from 'botbuilder';
import { ChoicePrompt, ComponentDialog, TextPrompt, WaterfallDialog, WaterfallStepContext } from 'botbuilder-dialogs';
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
        this.addDialog(new WaterfallDialog<UserProfile>('generalDialogsInternal', [
            this.promptForOptionSelection.bind(this),
            this.directToTest.bind(this),
            this.restartAsNecessary.bind(this),
        ]));

        // define dialogs to be used
        this.addDialog(new ChoicePrompt('choicePrompt'));
        this.addDialog(new TextPrompt('textPrompt'));

        // Save off our state accessor for later use
        this.userProfileAccessor = userProfileAccessor;
    }

    // Ask the user what they'd like to test and then load the appropriate dialogs for that
    private promptForOptionSelection = async (step: WaterfallStepContext<UserProfile>) => {
        return await step.prompt('choicePrompt', {
            choices: [
                'Text echo',
                'Send Attachments',
            ],
            prompt: 'What general function would you like to test?',
            retryPrompt: 'I didn\'t understand that. Please click an option',
        });
    }

    private directToTest = async (step: WaterfallStepContext<UserProfile>) => {
        switch (step.result.value) {
            case 'Text echo':
                return await this.testEcho(step);
            case 'Send attachments':
                return await this.testAttachments(step);
            default:
                return await step.next();
        }
    }
    
    // TODO: Create the testEcho and testAttachemnts prompts!!!
    private testEcho = async (step: WaterfallStepContext<UserProfile>) => {
        console.log('ok');
        return await step.next();
    }

    private testAttachments = async (step: WaterfallStepContext<UserProfile>) => {
        console.log('ok');
        return await step.next();
    }

    private restartAsNecessary = async (step: WaterfallStepContext<UserProfile>) => {
        console.log('last');
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
