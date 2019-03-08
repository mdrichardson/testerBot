const chalk = require('chalk');

export default {
    consolePrint(testName: string): void {
        console.log(`\nConducting [` + chalk.blue(testName) + `] Test\n`);
    },
    getTestChoiceParams(choices, testName: string): object {
        this.consolePrint(testName);
        return {
            choices: Object.keys(choices).map((key) => choices[key]),
            prompt: `What **[${testName}]** would you like to test?`,
            retryPrompt: `I didn't understand that. **Please click an option**`,
        };
    },
    getTestingDialogId(): string {
        return 'testingDialog';
    },
};
