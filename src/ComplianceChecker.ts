import { AssertionError } from "assert";
import { inject, injectable } from "tsyringe";

import { RequestError } from "@octokit/request-error";
import { ConsoleReporter } from './reporters/ConsoleReporter';
import { MultiReporter } from './reporters/MultiReporter';
import { Reporter } from "./reporters/Reporter";
import { TimestreamReporter } from './reporters/TimestreamReporter';
import { checkHumanName as humanCheckName, ruleHumanName as humanRuleName, Rule, RuleCheck } from "./Rule";
import { GitHubService } from "./services/GitHubService";

import './rules';
import { checks } from "./check";
import { Product } from "./model/Product";


export enum Result {
    PASS,
    WARN,
    FAIL,
    ERROR
}

@injectable()
export class ComplianceChecker {

    fixableResults = [ Result.FAIL, Result.WARN ]

    constructor(
        @inject('rules') private readonly rules: Rule[],
        private readonly gitHubService: GitHubService
    ) {
    }

    async main() {
        const doRepair = process.env.INPUT_REPAIR === 'true';

        const reporters: Reporter[] = [ new ConsoleReporter() ]
        if (TimestreamReporter.enabled()) {
            reporters.push(new TimestreamReporter())
        }
        const reporter = new MultiReporter(reporters);

        const product = new Product();
        reporter.startRun(product);
        let runOutcome = Result.PASS;

        try {
            product.repo = await this.gitHubService.loadRepository()
        } catch (error) {
            const remediation = 'check repo location and grant trilogy-eng-standards access';
            reporter.startRule('Setup');
            reporter.startCheck('Setup', 'product is setup for compliance checks');
            reporter.reportCheck('Setup', 'product is setup for compliance checks', { mandatory: true }, Result.FAIL, remediation);
            reporter.reportRule('Setup', Result.FAIL);
            runOutcome = Result.FAIL;
        }

        if (product.repo != null) {
            for(const rule of this.rules) {
                const humanRuleNameVal = humanRuleName(rule);
                reporter.startRule(humanRuleNameVal);
                let ruleOutcome = Result.PASS;

                for(const [checkName, checkFunc] of this.listChecks(rule)) {
                    const checkOptions = checks[checkName]
                    const humanCheckNameVal = humanCheckName(checkName);
                    const fixFunc = Reflect.get(rule, checkName.replace('check', 'fix'));
                    reporter.startCheck(humanRuleNameVal, humanCheckNameVal);

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
                            if (!(error instanceof AssertionError)) {
                                checkOutcome = Result.ERROR;
                                message = `${humanCheckNameVal}: ${error.message}`;
                            } else if (checkOptions.mandatory) {
                                checkOutcome = Result.FAIL;
                                message = error.message;
                            } else {
                                checkOutcome = Result.WARN;
                                message = error.message;
                            }
                        }

                        // try to repair it
                        if (attempt == 0 && this.fixableResults.includes(checkOutcome) && doRepair && fixFunc) {
                            try {
                                await fixFunc.call(rule, product);
                                product.repo = await this.gitHubService.loadRepository();
                                checkOutcome = undefined;
                                message = undefined;
                            } catch (repairError) {
                                message += ` and repair failed with ${repairError}`;
                            }
                        }
                    }

                    reporter.reportCheck(humanRuleNameVal, humanCheckNameVal, checkOptions, checkOutcome, message);
                    ruleOutcome = Math.max(ruleOutcome, checkOutcome)
                }

                reporter.reportRule(humanRuleNameVal, ruleOutcome);
                runOutcome = Math.max(runOutcome, ruleOutcome)
            }
        }

        reporter.reportRun(product, runOutcome);
        if (!runOutcome && doRepair) {
            console.log('trilogy-eng-standards needs admin access on your repository to fix most issues');
        }
        console.log('');
        process.exitCode = runOutcome < Result.ERROR ? 0 : 1;
    }

    listChecks(rule: any): Map<string,RuleCheck> {
        // there must be a better way to check if a function matches a type signature
        const pairs = Object.getOwnPropertyNames(Object.getPrototypeOf(rule))
            .filter(propName => typeof rule[propName] === 'function'
                && propName.startsWith('check') && propName != 'check'
            ).map((checkName): [string, RuleCheck] => [checkName, rule[checkName]]);
        return new Map(pairs);
    }

}
