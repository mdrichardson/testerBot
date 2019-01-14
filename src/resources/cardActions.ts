import { CardFactory } from "botbuilder";

export const cardActions = CardFactory.actions([
    {
        type: 'openUrl',
        title: 'Open URL',
        value: 'https://www.bing.com',
    },
    {
        type: 'imBack',
        title: 'imBack: "I am Back"',
        value: 'I am Back',
    },
    {
        type: 'postBack',
        title: 'postBack: "Posted Back"',
        value: 'Posted Back',
    },
    {
        type: 'call',
        title: 'Call 555-555-5555',
        value: 'tel:5555555555',
    },
    {
        type: 'playAudio',
        title: 'Play Audio',
        value: 'https://www.mediacollege.com/downloads/sound-effects/star-wars/darthvader/darthvader_yourfather.wav',
    },
    {
        type: 'playVideo',
        title: 'Play Video',
        value: 'https://adaptivecardsblob.blob.core.windows.net/assets/AdaptiveCardsOverviewVideo.mp4',
    },
    {
        type: 'showImage',
        title: 'Show Image',
        value: 'https://adaptivecards.io/content/poster-video.png',
    },
    {
        type: 'downloadFile',
        title: 'Download File',
        value: 'http://download.microsoft.com/download/D/E/4/DE4BEB47-D7D6-4398-AB92-CB449D2FE60E/8_BotFramework.pdf',
    },
    {
        type: 'signin',
        title: 'Sign In',
        value: 'https://login.microsoftonline.com',
    },
])