import { QnAMaker, QnAMakerEndpoint } from 'botbuilder-ai';
import { ChoicePrompt, ComponentDialog, TextPrompt, WaterfallDialog, WaterfallStepContext } from 'botbuilder-dialogs';
import utilities from '../resources/utilities';

const choices = {
    QUESTION: 'Ask a Question',
    BACK: 'Back',
};

const dialogIds = {
    QNA_MAIN: 'qnaMainDialog',
    QNA_QUESTION: 'qnaQuestionDialog',
};

const promptIds = {
    CHOICE: 'ChoicePrompt',
    TEXT: 'textPrompt',
};

export class QnaDialog extends ComponentDialog {
    private qnamaker: QnAMaker;

    constructor(dialogId: string, endpointSettings: QnAMakerEndpoint) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) { throw new Error('Missing parameter.  dialogId is required'); }

        // Define main conversation flow
        this.addDialog(new WaterfallDialog(dialogIds.QNA_MAIN, [
            this.promptForOptionSelection.bind(this),
            this.executeAppropriateAction.bind(this),
            this.end.bind(this),
        ]));

        this.addDialog(new WaterfallDialog(dialogIds.QNA_QUESTION, [
            this.promptForQuestion.bind(this),
            this.displayAnswer.bind(this),
            this.end.bind(this),
        ]));

        // define dialogs to be used
        this.addDialog(new ChoicePrompt(promptIds.CHOICE));
        this.addDialog(new TextPrompt(promptIds.TEXT));

        this.qnamaker = new QnAMaker(endpointSettings, {});
    }

    // Ask the user what they'd like to test and then load the appropriate dialogs for that
    private promptForOptionSelection = async (step: WaterfallStepContext) => {
        // Display prompt
        return await step.prompt(promptIds.CHOICE, utilities.getTestChoiceParams(choices, 'QnA'));
    }

    private executeAppropriateAction = async (step: WaterfallStepContext) => {
        switch (step.result.value) {
            case choices.QUESTION:
                return await step.replaceDialog(dialogIds.QNA_QUESTION);
            case choices.BACK:
            default:
                return await step.replaceDialog(utilities.getTestingDialogId());
        }
    }

    private promptForQuestion = async (step: WaterfallStepContext) => {
        utilities.beginTestPrint('QnA Question');
        return await step.prompt(promptIds.TEXT, {
            prompt: `Ask a question in my Knowledgebase and I'll provide the answer.\n` +
                    `**Example Questions:**\n` +
                    `&nbsp;&nbsp;Why did Microsoft develop the Bot Framework?\n` +
                    `&nbsp;&nbsp;What is the v4 SDK?\n` +
                    `&nbsp;&nbsp;Why is V4 not backwards compatible with V3?\n` +
                    `&nbsp;&nbsp;Should I build a new bot using V3 or V4?\n`,
        });
    }

    private displayAnswer = async (step: WaterfallStepContext) => {
        const qnaResults = await this.qnamaker.getAnswers(step.context);
        if (qnaResults[0]) {
            await step.context.sendActivity(`ANSWER FOUND: ${qnaResults[0].answer}`);
            await step.context.sendActivity(`**Details:**\n${JSON.stringify(qnaResults, null, 4)}`);
        } else {
            await step.context.sendActivity(`No Answer Found`);
        }
        utilities.endTestPrint('QnA Question');
        return await step.next();
    }

    private end = async (step: WaterfallStepContext) => {
        utilities.endTestPrint('QnA');
        return await step.beginDialog(dialogIds.QNA_MAIN);
    }
}
