const chalk = require('chalk');

export default {
    beginTestPrint(testName: string): void {
        console.log(`\nConducting [` + chalk.green(testName) + `] Test\n`);
    },
    endTestPrint(testName: string): void {
        console.log(`\nConducting [` + chalk.red(testName) + `] Test\n`);
    },
    getTestChoiceParams(choices: any, testName: string): object {
        this.beginTestPrint(testName);
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
