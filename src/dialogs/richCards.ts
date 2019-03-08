import { Activity, CardFactory } from 'botbuilder';
import { ChoicePrompt, ComponentDialog, TextPrompt, WaterfallDialog, WaterfallStepContext } from 'botbuilder-dialogs';

import * as adaptiveCard from '../resources/adaptiveCard.json';
import { cardActions } from '../resources/cardActions';
import utilities from '../resources/utilities';

const choices = {
    adaptive: 'Adaptive',
    animation: 'Animation',
    audio: 'Audio',
    hero: 'Hero',
    thumbnail: 'Thumbnail',
    receipt: 'Receipt',
    signIn: 'Sign In',
    video: 'Video',
    back: 'Back',
};

const dialogIds = {
    RICH_CARDS_MAIN: 'richCardsMainDialog',
    DISPLAY_CARDS: 'displayCardsDialog',
};

const promptIds = {
    CHOICE: 'choicePrompt',
    TEXT: 'textPrompt',
};

interface IStepOptionsCard {
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

        this.addDialog(new WaterfallDialog(dialogIds.DISPLAY_CARDS, [
            this.displayCards.bind(this),
            this.end.bind(this),
        ]));

        // define dialogs to be used
        this.addDialog(new ChoicePrompt(promptIds.CHOICE));
        this.addDialog(new TextPrompt(promptIds.TEXT));
    }

    // Ask the user what they'd like to test and then load the appropriate dialogs for that
    private promptForOptionSelection = async (step: WaterfallStepContext) => {
        utilities.consolePrint('Rich Card Choices');
        // Display prompt
        return await step.prompt(promptIds.CHOICE, {
            choices: Object.keys(choices).map((key) => choices[key]),
            prompt: 'What **[Rich Card]** would you like to test?',
            retryPrompt: 'I didn\'t understand that. Please click an option',
        });
    }

    private displayAppropriateCard = async (step: WaterfallStepContext) => {
        switch (step.result.value) {
            case choices.adaptive:
                return await this.createAdaptive(step);
            case choices.animation:
                return await this.createAnimation(step);
            case choices.audio:
                return await this.createAudio(step);
            case choices.hero:
                return await this.createHero(step);
            case choices.thumbnail:
                return await this.createThumbnail(step);
            case choices.receipt:
                return await this.createReceipt(step);
            case choices.signIn:
                return await this.createSignIn(step);
            case choices.video:
                return await this.createVideo(step);
            case choices.back:
            default:
                return await step.endDialog();
        }
    }

    private createAdaptive = async (step: WaterfallStepContext) => {
        const card = CardFactory.adaptiveCard(adaptiveCard);
        return await step.beginDialog(dialogIds.DISPLAY_CARDS, {
            card,
            cardName: choices.adaptive,
        });
    }

    private createAnimation = async (step: WaterfallStepContext) => {
        const card = CardFactory.animationCard(
            'Animation Card',
            [
                {url: 'https://i.gifer.com/Y6X3.gif'},
            ],
            cardActions,
            {
                subtitle: 'Test',
            },
        );
        return await step.beginDialog(dialogIds.DISPLAY_CARDS, {
            card,
            cardName: choices.animation,
        });
    }

    private createAudio = async (step: WaterfallStepContext) => {
        const card = CardFactory.audioCard(
            'Audio Card',
            ['https://www.mediacollege.com/downloads/sound-effects/star-wars/darthvader/darthvader_yourfather.wav'],
            cardActions,
            {
                subtitle: 'Test',
            },
        );
        return await step.beginDialog(dialogIds.DISPLAY_CARDS, {
            card,
            cardName: choices.audio,
        });
    }

    private createHero = async (step: WaterfallStepContext) => {
        const card = CardFactory.heroCard(
            'Hero Card',
            CardFactory.images(['https://www.ozoneheroes.org/assets/img/ironmanclipped.png']),
            cardActions,
            {
                subtitle: 'Test',
            },
        );
        return await step.beginDialog(dialogIds.DISPLAY_CARDS, {
            card,
            cardName: choices.hero,
        });
    }

    private createThumbnail = async (step: WaterfallStepContext) => {
        const card = CardFactory.thumbnailCard(
            'Thumbnail Card',
            [{ url: 'https://www.ozoneheroes.org/assets/img/ironmanclipped.png' }],
            cardActions,
            {
                subtitle: 'Test',
            },
        );
        return await step.beginDialog(dialogIds.DISPLAY_CARDS, {
            card,
            cardName: choices.thumbnail,
        });
    }

    private createReceipt = async (step: WaterfallStepContext) => {
        const card = CardFactory.receiptCard({
            title: 'Receipt Card',
            facts: [
                {
                    key: 'Fact 1',
                    value: '1',
                },
                {
                    key: 'Fact 2',
                    value: '2',
                },
            ],
            items: [
                {
                    title: 'Item 1',
                    price: '$1.00',
                    quantity: '1',
                    image: { url: 'https://github.com/amido/azure-vector-icons/raw/master/renders/traffic-manager.png' },
                    subtitle: 'subtitle 1',
                    text: 'text 1',
                    tap: {
                        type: 'openUrl',
                        title: 'Tap',
                        value: 'https://azure.microsoft.com/en-us/pricing/details/bot-service/',
                    },
                },
                {
                    title: 'Item 2',
                    price: '$200.20',
                    quantity: '20',
                    image: { url: 'https://github.com/amido/azure-vector-icons/raw/master/renders/traffic-manager.png' },
                    subtitle: 'subtitle 2',
                    text: 'text 2',
                    tap: {
                        type: 'openUrl',
                        title: 'Tap',
                        value: 'https://azure.microsoft.com/en-us/pricing/details/bot-service/',
                    },
                },
            ],
            tax: '$5.00',
            total: '$99999.99',
            buttons: cardActions,
            tap: {
                type: 'openUrl',
                title: 'Tap',
                value: 'https://azure.microsoft.com/en-us/pricing/details/bot-service/',
            },
            vat: 'vat',
        });
        return await step.beginDialog(dialogIds.DISPLAY_CARDS, {
            card,
            cardName: choices.receipt,
        });
    }

    private createSignIn = async (step: WaterfallStepContext) => {
        const card = CardFactory.signinCard(
            'Sign In Card',
            'https://login.microsoftonline.com',
            'Sign In',
        );
        return await step.beginDialog(dialogIds.DISPLAY_CARDS, {
            card,
            cardName: choices.signIn,
        });
    }

    private createVideo = async (step: WaterfallStepContext) => {
        const card = CardFactory.videoCard(
            'Video Card',
            [{ url: 'https://adaptivecardsblob.blob.core.windows.net/assets/AdaptiveCardsOverviewVideo.mp4' }],
            cardActions,
            {
                subtitle: 'subtitle',
                text: 'text',
            },
        );
        return await step.beginDialog(dialogIds.DISPLAY_CARDS, {
            card,
            cardName: choices.video,
        });
    }

    private restart = async (step: WaterfallStepContext) => {
        return await step.beginDialog(dialogIds.RICH_CARDS_MAIN);
    }

    private displayCards = async (step: WaterfallStepContext) => {
        const options = step.options as IStepOptionsCard;
        const card = options.card;
        const cardName = options.cardName;
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
        utilities.consolePrint(cardName);
        // send all cards
        return await step.context.sendActivities([single, list, carousel]);
    }

    private end = async (step: WaterfallStepContext) => {
        return await step.beginDialog('testingOptions');
    }
}
