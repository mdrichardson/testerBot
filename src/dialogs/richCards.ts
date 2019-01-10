import { ChoicePrompt, ComponentDialog, TextPrompt, WaterfallDialog, WaterfallStepContext } from 'botbuilder-dialogs';
import { CardFactory, Activity } from 'botbuilder';

import * as adaptiveCard from '../resources/adaptiveCard.json';

const choices = {
    adaptive: 'Adaptive',
    animation: 'Animation',
    audio: 'Audio',
    hero: 'Hero',
    oAuth: 'OAuth',
    thumbnail: 'Thumbnail',
    receipt: 'Receipt',
    signIn: 'Sign In',
    video: 'Video',
    back: 'Back',
};

const dialogIds = {
    RICH_CARDS_MAIN: 'richCardsMainDialog',
    CARDS_WITH_SUBMIT: 'submitDialog',
};

const promptIds = {
    CHOICE: 'choicePrompt',
    TEXT: 'textPrompt',
};

interface ICard_Options {
    card: any;
    cardName: string;
} 

export class RichCardsDialog extends ComponentDialog {

    constructor(dialogId: string) {
        super(dialogId);

        // validate what was passed in
        if (!dialogId) { throw new Error('Missing parameter.  dialogId is required'); }

        // Define main conversation flow
        this.addDialog(new WaterfallDialog(dialogIds.RICH_CARDS_MAIN, [
            this.promptForOptionSelection.bind(this),
            this.displayAppropriateCard.bind(this),
            this.restart.bind(this),
        ]));

        this.addDialog(new WaterfallDialog(dialogIds.CARDS_WITH_SUBMIT, [
            this.displayCardsWithSubmit.bind(this),
            this.end.bind(this),
        ]));

        // define dialogs to be used
        this.addDialog(new ChoicePrompt(promptIds.CHOICE));
        this.addDialog(new TextPrompt(promptIds.TEXT));
    }

    // Ask the user what they'd like to test and then load the appropriate dialogs for that
    private promptForOptionSelection = async (step: WaterfallStepContext) => {
        // Display prompt
        return await step.prompt(promptIds.CHOICE, {
            choices: Object.keys(choices).map(key => choices[key]),
            prompt: 'What [Rich Card] would you like to test?',
            retryPrompt: 'I didn\'t understand that. Please click an option',
        });
    }

    private displayAppropriateCard = async (step: WaterfallStepContext) => {
        switch (step.result.value) {
            case choices.adaptive:
                return await this.displayAdaptive(step);
            // case choices.animation:
            //     return await this.displayAnimation(step);
            // case choices.audio:
            //     return await this.displayAudio(step);
            // case choices.hero:
            //     return await this.displayHero(step);
            // case choices.oAuth:
            //     return await this.displayOAuth(step);
            // case choices.thumbnail:
            //     return await this.displayThumbnail(step);               
            // case choices.receipt:
            //     return await this.displayReceipt(step);               
            // case choices.signIn:
            //     return await this.displaySignIn(step);               
            // case choices.video:
            //     return await this.displayVideo(step);               
            case choices.back:
            default:
                return await step.endDialog();
        }
    }

    private displayAdaptive = async (step: WaterfallStepContext) => {
        const card = CardFactory.adaptiveCard(adaptiveCard);
        return await step.beginDialog(dialogIds.CARDS_WITH_SUBMIT, {
            card: card,
            cardName: choices.adaptive,
        });
    }

    private restart = async (step: WaterfallStepContext) => {
        return await step.beginDialog(dialogIds.RICH_CARDS_MAIN);
    }

    private displayCardsWithSubmit = async (step: WaterfallStepContext) => {
        const card = step.options['card'];
        const cardName = step.options['cardName'];
        // define single card
        const single: Partial<Activity> = {
            text: `${cardName} Card - Single`,
            attachments: [card],
        };
        // define list of cards
        const list: Partial<Activity> = {
            text: `${cardName} Card - List`,
            attachments: [card, card],
            attachmentLayout: 'list',
        };
        // define carousel of cards
        const carousel: Partial<Activity> = {
            text: `${cardName} Card - Carousel`,
            attachments: [card, card, card],
            attachmentLayout: 'carousel',
        };
        // send all cards
        return await step.context.sendActivities([single, list, carousel]);
    }

    private end = async (step: WaterfallStepContext) => {
        await step.endDialog();
    }
}
