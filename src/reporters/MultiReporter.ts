import { injectAll, singleton } from "tsyringe";
import { CheckOptions } from "../check";
import { Result } from "../ComplianceChecker";
import { Product } from "../model/Product";
import { Reporter } from "./Reporter";

@singleton()
export class MultiReporter extends Reporter {

    constructor(
        @injectAll(Reporter) public readonly reporters: Reporter[]
    ) {
        super()
    }
    
    startRun(product: Product): void {
        this.reporters.forEach(reporter => reporter.startRun(product))
    }

    startRule(ruleName: string): void {
        this.reporters.forEach(reporter => reporter.startRule(ruleName))
    }

    startCheck(ruleName: string, checkName: string): void {
        this.reporters.forEach(reporter => reporter.startCheck(ruleName, checkName))
    }

    reportCheck(ruleName: string, checkName: string, checkOptions: CheckOptions, outcome: Result, message?: string): void {
        this.reporters.forEach(reporter => reporter.reportCheck(ruleName, checkName, checkOptions, outcome, message))
    }

    reportMetric(ruleName: string, metricName: string, value: number, time?: Date): void {
        this.reporters.forEach(reporter => reporter.reportMetric(ruleName, metricName, value, time))
    }

    reportRule(ruleName: string, outcome: Result): void {
        this.reporters.forEach(reporter => reporter.reportRule(ruleName, outcome))
    }

    reportRun(product: Product, outcome: Result): void {
        this.reporters.forEach(reporter => reporter.reportRun(product, outcome))
    }

}
