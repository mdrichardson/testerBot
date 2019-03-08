const chalk = require('chalk');

export default {
    consolePrint(testName: string) {
        console.log(`\nConducting [` + chalk.blue(testName) + `] Test\n`);
    },
};
