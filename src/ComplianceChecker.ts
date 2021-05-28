import { AssertionError } from "assert";
import { inject, injectable, injectAll } from "tsyringe";

import { checks } from "./check";
import { Product } from "./model/Product";
import { Reporter } from "./reporters/Reporter";
import { checkHumanName as humanCheckName, ruleHumanName as humanRuleName, Rule, RuleCheck, RuleMetric, MetricWriter } from "./Rule";
import { GitHubService } from "./services/GitHubService";

import './reporters';
import './rules';
import { MultiReporter } from "./reporters/MultiReporter";

export enum Result {
    PASS,
    WARN,
    FAIL,
    ERROR
}

@injectable()
export class ComplianceChecker {

    readonly fixableResults = [ Result.FAIL, Result.WARN ]
    readonly doRepair: boolean;

    constructor(
        @injectAll(Rule) private readonly rules: Rule[],
        @inject(MultiReporter) private readonly reporter: Reporter,
        private readonly gitHubService: GitHubService
    ) {
        this.doRepair = process.env.INPUT_REPAIR === 'true';
    }

    async checkProduct(product: Product): Promise<void> {
        this.reporter.startRun(product);
        let runOutcome = Result.PASS;

        try {
            product.repo = await this.gitHubService.loadRepository(product.repoId);
        } catch (error) {
            const remediation = 'check repo location and grant trilogy-eng-standards access';
            this.reporter.startRule('Setup');
            this.reporter.startCheck('Setup', 'product is setup for compliance checks');
            this.reporter.reportCheck('Setup', 'product is setup for compliance checks', { mandatory: true }, Result.FAIL, remediation);
            this.reporter.reportRule('Setup', Result.FAIL);
            runOutcome = Result.FAIL;
        }

        if (product.repo != null) {
            for(const rule of this.rules) {
                const humanRuleNameVal = humanRuleName(rule);
                this.reporter.startRule(humanRuleNameVal);
                let ruleOutcome = Result.PASS;

                for(const [checkName, checkFunc] of this.listChecks(rule)) {
                    const checkOptions = checks[checkName]
                    const humanCheckNameVal = humanCheckName(checkName);
                    const fixFunc = Reflect.get(rule, checkName.replace('check', 'fix'));
                    this.reporter.startCheck(humanRuleNameVal, humanCheckNameVal);

                    if (checkOptions == null) {
                        throw new Error(`Cannot find options for ${checkName} did you declare it with @check?`)
                    }

                    let checkOutcome: Result | undefined;
                    let message;
                    for(let attempt = 0; checkOutcome == null; attempt++) {
                        // check the status
                        try {
                            await checkFunc.call(rule, product);
                            checkOutcome = Result.PASS;
                        } catch (error) {
                            checkOutcome = checkOptions.mandatory ? Result.FAIL : Result.WARN;
                            if (error instanceof AssertionError) {
                                message = error.message;
                            } else {
                                message = `${humanCheckNameVal}: ${error.message}`;
                            }
                        }

                        // try to repair it
                        if (attempt == 0 && this.fixableResults.includes(checkOutcome) && this.doRepair && fixFunc) {
                            try {
                                await fixFunc.call(rule, product);
                                product.repo = await this.gitHubService.loadRepository(product.repoId);
                                checkOutcome = undefined;
                                message = undefined;
                            } catch (repairError) {
                                message += ` and repair failed with ${repairError}`;
                            }
                        }
                    }

                    this.reporter.reportCheck(humanRuleNameVal, humanCheckNameVal, checkOptions, checkOutcome, message);
                    ruleOutcome = Math.max(ruleOutcome, checkOutcome)
                }

                const reporter = this.reporter
                for(const [metricName, metricFunc] of this.listMetrics(rule)) {
                    const humanMetricNameVal = humanCheckName(metricName);
                    const metrics: MetricWriter = {
                        report(value: number, time?: Date): void {
                            reporter.reportMetric(humanRuleNameVal, humanMetricNameVal, value, time)
                        }
                    }

                    try {
                        await metricFunc.call(rule, product, metrics);
                    } catch (error) {
                        // cannot get metric, log a warning and continue
                        console.error(`Failed to retrieve metric ${humanRuleNameVal}.${humanMetricNameVal}`, error)
                    }
                }

                this.reporter.reportRule(humanRuleNameVal, ruleOutcome);
                runOutcome = Math.max(runOutcome, ruleOutcome)
            }
        }

        this.reporter.reportRun(product, runOutcome);
        if (!runOutcome && this.doRepair) {
            console.log('trilogy-eng-standards needs admin access on your repository to fix most issues');
        }
        console.log('');
        process.exitCode = runOutcome < Result.FAIL ? 0 : 1;
    }

    listChecks(rule: any): Map<string, RuleCheck> {
        // there must be a better way to check if a function matches a type signature
        const pairs = Object.getOwnPropertyNames(Object.getPrototypeOf(rule))
            .filter(propName => typeof rule[propName] === 'function'
                && propName.startsWith('check') && propName != 'check'
            ).map((checkName): [string, RuleCheck] => [checkName, rule[checkName]]);
        return new Map(pairs);
    }

    listMetrics(rule: any): Map<string, RuleMetric> {
        // there must be a better way to check if a function matches a type signature
        const pairs = Object.getOwnPropertyNames(Object.getPrototypeOf(rule))
            .filter(propName =>
                typeof rule[propName] === 'function'
                && propName.startsWith('metric')
            ).map((name): [string, RuleMetric] => [name, rule[name]]);
        return new Map(pairs);
    }

}
