import { ComponentDialog, DialogContext, PromptValidatorContext, TextPrompt } from 'botbuilder-dialogs';

export class Testing extends ComponentDialog {
    constructor(dialogId: string) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) { throw new Error('Missing parameter.  dialogId is required'); }
        }

        // Ask the user what they'd like to test and then load the appropriate dialogs for that
        public displayOptions = async () => {
            console.log('made it');
    }
}
