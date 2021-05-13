import { Result } from '../ComplianceChecker';
import { Reporter } from './Reporter';
import Chalk from 'chalk';
import { Product } from '../model/Product';
import { CheckOptions } from '../check';

export class ConsoleReporter extends Reporter {

    startRule(ruleName: string) {
        console.log(`\n${ruleName}`);
    }

    reportCheck(ruleName: string, checkName: string, checkOptions: CheckOptions, outcome: Result, message?: string) {
        console.log(`${this.renderCheckOutcome(outcome)} ${message ?? checkName}`);
    }

    // don't log metrics, they're a bit spammy, but you'll need this for debugging metrics
    // reportMetric(ruleName: string, metricName: string, value: number, time?: Date) {
    //     console.log(Chalk.gray(`# ${metricName} ${time?.toISOString()} ${value}`))
    // }

    symbol(result: Result): string {
        switch (result) {
            case Result.PASS: return '✓';
            case Result.FAIL: return '✗';
            case Result.WARN: return '-';
            case Result.ERROR: return '!';
        }
    }

    color(result: Result): Chalk.Chalk {
        switch (result) {
            case Result.PASS: return Chalk.green;
            case Result.FAIL: return Chalk.red;
            case Result.WARN: return Chalk.yellow;
            case Result.ERROR: return Chalk.red;
        }
    }

    renderCheckOutcome(result: Result): string {
        return this.color(result)(this.symbol(result));
    }

    renderOverallOutcome(result: Result): string {
        return Chalk.inverse(this.color(result)(Result[result]));
    }

    reportRun(product: Product, outcome: Result) {
        const outcomeText = this.renderOverallOutcome(outcome);
        console.log(`\n${Chalk.inverse(outcomeText)}`);
    }

}