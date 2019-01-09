import { AttachmentPrompt, ChoicePrompt, ComponentDialog, TextPrompt, WaterfallDialog, WaterfallStepContext } from 'botbuilder-dialogs';

const choices = {
    echo: 'Text Echo',
    attachment: 'Attachment Echo',
    back: 'Back',
};

const dialogIds = {
    ECHO_MAIN: 'echoMainDialog',
    TEXT_ECHO: 'textEchoDialog',
    ATTACHMENT_ECHO: 'attachmentEchoDialog',
};

const promptIds = {
    CHOICE: 'choicePrompt',
    TEXT: 'textPrompt',
    ATTACHMENT: 'attachmentPrompt',
};

export class EchosDialog extends ComponentDialog {

    constructor(dialogId: string) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) { throw new Error('Missing parameter.  dialogId is required'); }

        // Define main conversation flow
        this.addDialog(new WaterfallDialog(dialogIds.ECHO_MAIN, [
            this.promptForOptionSelection.bind(this),
            this.directToTest.bind(this),
        ]));

        // Define conversation flow for echo test
        this.addDialog(new WaterfallDialog(dialogIds.TEXT_ECHO, [
            this.getEcho.bind(this),
            this.endEcho.bind(this),
        ]));

        // Define conversation flow for attachment test
        this.addDialog(new WaterfallDialog(dialogIds.ATTACHMENT_ECHO, [
            this.getAttachment.bind(this),
            this.endAttachment.bind(this),
        ]));

        // define dialogs to be used
        this.addDialog(new ChoicePrompt(promptIds.CHOICE));
        this.addDialog(new TextPrompt(promptIds.TEXT));
        this.addDialog(new AttachmentPrompt(promptIds.ATTACHMENT));
    }

    // Ask the user what they'd like to test and then load the appropriate dialogs for that
    private promptForOptionSelection = async (step: WaterfallStepContext) => {

        // Display prompt
        return await step.prompt(promptIds.CHOICE, {
            choices: Object.keys(choices).map(key => choices[key]),
            prompt: 'What echo function would you like to test?',
            retryPrompt: 'I didn\'t understand that. Please click an option',
        });
    }

    private directToTest = async (step: WaterfallStepContext) => {
        switch (step.result.value) {
            case choices.echo:
                return await step.beginDialog(dialogIds.TEXT_ECHO);
            case choices.attachment:
                return await step.beginDialog(dialogIds.ATTACHMENT_ECHO);
            case choices.back:
            default:
                return await step.endDialog();
        }
    }

    private getEcho = async (step: WaterfallStepContext) => {
        console.log('\nConducting [Echo] Test\n');
        return await step.prompt(promptIds.TEXT, {
            prompt: 'Enter some text and I\'ll repeat it back.',
        });
    }

    private endEcho = async (step: WaterfallStepContext) => {
        const toEcho = step.result;
        const reply = `You said: ${toEcho}`;
        await step.context.sendActivity(reply);
        console.log(reply);
        console.log('\nCompleted [Echo] Test\n');
        return await step.beginDialog(dialogIds.ECHO_MAIN);
    }

    private getAttachment = async (step: WaterfallStepContext) => {
        console.log('\nConducting [Attachment] Test\n');
        return await step.prompt(promptIds.ATTACHMENT, {
            prompt: 'Send me an attachment of any kind and I\'ll tell you all the details I know about it.',
        });
    }

    private endAttachment = async (step: WaterfallStepContext) => {
        const attachment = step.result[0];
        const reply =
            `You sent:\n
            --Name: ${attachment.name}\n
            --Content Type: ${attachment.contentType}\n
            --URL: ${attachment.contentUrl}`;
        await step.context.sendActivity({
            text: reply,
            attachments: [attachment],
        });
        console.log(reply);
        console.log('\n[Attachment] Test Complete\n');
        return await step.beginDialog(dialogIds.ECHO_MAIN);
    }
}
