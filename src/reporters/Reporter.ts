import { CheckOptions } from "../check";
import { Result } from "../ComplianceChecker";
import { Product } from "../model/Product";

export class Reporter {

    startRun(product: Product): void {
        // do not report by default
    }

    startRule(ruleName: string): void {
        // do not report by default
    }

    startCheck(ruleName: string, checkName: string): void {
        // do not report by default
    }

    reportCheck(ruleName: string, checkName: string, checkOptions: CheckOptions, outcome: Result, message?: string): void {
        // do not report by default
    }

    reportMetric(ruleName: string, metricName: string, value: number, time?: Date): void {
        // do not report by default
    }

    reportRule(ruleName: string, outcome: Result): void {
        // do not report by default
    }

    reportRun(product: Product, outcome: Result): void {
        // do not report by default
    }

}

