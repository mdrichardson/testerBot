// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { BlobStorage } from 'botbuilder-azure';
import { config } from 'dotenv';
import * as path from 'path';
import * as restify from 'restify';

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
import { BotFrameworkAdapter, ConversationState, UserState } from 'botbuilder';

// Import required bot configuration.
import { BlobStorageService, BotConfiguration, IEndpointService } from 'botframework-config';

// Read botFilePath and botFileSecret from .env file
// Note: Ensure you have a .env file and include botFilePath and botFileSecret.
const ENV_FILE = path.join(__dirname, '..', '.env');
const loadFromEnv = config({ path: ENV_FILE });

// Get the .bot file path.
// See https://aka.ms/about-bot-file to learn more about .bot file its use and bot configuration.
const BOT_FILE = path.join(__dirname, '..', (process.env.botFilePath || ''));
let botConfig: BotConfiguration;

console.log(BOT_FILE);

try {
    // Read bot configuration from .bot file.
    botConfig = BotConfiguration.loadSync(BOT_FILE, process.env.botFileSecret);
} catch (err) {
    console.error(`\nError reading bot file. Please ensure you have valid botFilePath and botFileSecret set for your environment.`);
    console.error(`\n - The botFileSecret is available under appsettings for your Azure Bot Service bot.`);
    console.error(`\n - If you are running this bot locally, consider adding a .env file with botFilePath and botFileSecret.`);
    console.error(`\n - See https://aka.ms/about-bot-file to learn more about .bot file its use and bot configuration.\n\n`);
    process.exit();
}

// For local development configuration as defined in .bot file
const DEV_ENVIRONMENT = 'development';

// Define name of the endpoint configuration section from the .bot file.
const BOT_CONFIGURATION = (process.env.NODE_ENV || DEV_ENVIRONMENT);
const STORAGE_CONFIGURATION_ID = '64'; // blob service's "id" in .bot file

// Get bot endpoint configuration by service name.
// Bot configuration as defined in .bot file.
const endpointConfig = botConfig.findServiceByNameOrId(BOT_CONFIGURATION) as IEndpointService;

// This bot's main dialog.
import { MultiChannelBot } from './bot';

// Create HTTP server.
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
    console.log(`\n${ server.name } listening to ${ server.url }`);
});

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about .bot file its use and bot configuration.
const adapter = new BotFrameworkAdapter({
    appId: endpointConfig.appId || process.env.microsoftAppID,
    appPassword: endpointConfig.appPassword || process.env.microsoftAppPassword,
});


// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    console.error(`\n [onTurnError]: ${ error }`);
    // Send a message to the user
    await context.sendActivity(`Oops. Something went wrong!`);
};

// Define blob storage for bot
// Get service configuration
const blobStorageConfig = botConfig.findServiceByNameOrId(STORAGE_CONFIGURATION_ID) as BlobStorageService;
const blobStorage = new BlobStorage({
    containerName: (blobStorageConfig.container),
    storageAccountOrConnectionString: blobStorageConfig.connectionString,
});
const conversationState: ConversationState = new ConversationState(blobStorage);
const userState: UserState = new UserState(blobStorage);

// Create the main dialog.
let multiChannelBot;
try {
    multiChannelBot = new MultiChannelBot(conversationState, userState, botConfig);
} catch (err) {
    console.error(`[botInitialization Error]: ${err}`);
    process.exit();
}

// Listen for incoming requests.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // Route to main dialog.
        await multiChannelBot.onTurn(context);
    });
});
