import { CheckOptions } from "../check";
import { Result } from "../ComplianceChecker";
import { Product } from "../model/Product";

export abstract class Reporter {

    startRun(product: Product) {
        // do not report by default
    }

    startRule(ruleName: string) {
        // do not report by default
    }

    startCheck(ruleName: string, checkName: string) {
        // do not report by default
    }

    reportCheck(ruleName: string, checkName: string, checkOptions: CheckOptions, outcome: Result, message?: string) {
        // do not report by default
    }

    reportMetric(ruleName: string, metricName: string, value: number, time?: Date) {
        // do not report by default
    }

    reportRule(ruleName: string, outcome: Result) {
        // do not report by default
    }

    reportRun(product: Product, outcome: Result) {
        // do not report by default
    }

}

