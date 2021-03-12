import { Result } from '../ComplianceChecker';
import { Reporter } from './Reporter';
import Chalk from 'chalk';
import { Product } from '../model/Product';

export class ConsoleReporter extends Reporter {

    startRule(ruleName: string) {
        console.log(`\n${ruleName}`);
    }

    reportCheck(ruleName: string, checkName: string, outcome: Result, message?: string) {
        console.log(`${this.renderCheckOutcome(outcome)} ${message ?? checkName}`);
    }

    renderCheckOutcome(result: Result) {
        switch (result) {
            case Result.PASS: return Chalk.green('✓');
            case Result.FAIL: return Chalk.red('✗');
            case Result.ERROR: return Chalk.red('!');
        }
    }

    reportRun(product: Product, outcome: Result) {
        console.log(`\n${Chalk.inverse(outcome == Result.PASS ? Chalk.green('PASS') : Chalk.red('FAIL'))}`);
    }

}