import { AssertionError } from "assert";
import { inject, injectable } from "tsyringe";

import { ConsoleReporter } from './reporters/ConsoleReporter';
import { MultiReporter } from './reporters/MultiReporter';
import { Reporter } from "./reporters/Reporter";
import { TimestreamReporter } from './reporters/TimestreamReporter';
import { checkHumanName as humanCheckName, ruleHumanName as humanRuleName, Rule, RuleCheck } from "./Rule";
import { ProductService } from "./services/ProductService";

import './rules';

export const enum Result {
    PASS,
    FAIL,
    ERROR
}

@injectable()
export class ComplianceChecker {

    constructor(
        @inject('rules') private readonly rules: Rule[],
        private readonly productService: ProductService
    ) {
    }

    async main() {
        const doRepair = process.env.INPUT_REPAIR === 'true';
        const branch = String(process.env.INPUT_BRANCH ?? 'main');

        const reporters: Reporter[] = [ new ConsoleReporter() ]
        if (process.env.INPUT_TIMESTREAM_DB != null) {
            reporters.push(new TimestreamReporter())
        }
        const reporter = new MultiReporter(reporters);

        let product = await this.productService.loadProduct(branch);

        reporter.startRun(product);
        let passing = true;

        for(const rule of this.rules) {
            const humanRuleNameVal = humanRuleName(rule);
            reporter.startRule(humanRuleNameVal);
            let rulePassing = true;

            for(const [checkName, checkFunc] of this.listChecks(rule)) {
                const humanCheckNameVal = humanCheckName(checkName);
                const fixFunc = Reflect.get(rule, checkName.replace('check', 'fix'));
                reporter.startCheck(humanRuleNameVal, humanCheckNameVal);

                let outcome;
                let message;
                for(let attempt = 0; outcome == null; attempt++) {
                    // check the status
                    try {
                        await checkFunc.call(rule, product);
                        outcome = Result.PASS;
                    } catch (error) {
                        if (error instanceof AssertionError) {
                            outcome = Result.FAIL;
                            message = error.message;
                        } else {
                            outcome = Result.ERROR;
                            message = `${humanCheckNameVal}: ${error.message}`;
                        }
                    }

                    // try to repair it
                    if (attempt == 0 && outcome != Result.PASS && doRepair && fixFunc) {
                        try {
                            await fixFunc.call(rule, product);
                            product = await this.productService.loadProduct(branch);
                            outcome = undefined;
                            message = undefined;
                        } catch (repairError) {
                            message += ` and repair failed with ${repairError}`;
                        }
                    }
                }

                reporter.reportCheck(humanRuleNameVal, humanCheckNameVal, outcome, message);
                rulePassing &&= (outcome == Result.PASS);
            }

            reporter.reportRule(humanRuleNameVal, rulePassing ? Result.PASS : Result.FAIL);
            passing &&= rulePassing;
        }

        reporter.reportRun(product, passing ? Result.PASS : Result.FAIL);
        if (!passing && doRepair) {
            console.log('trilogy-eng-standards needs admin access on your repository to fix most issues');
        }
        console.log('');
        process.exitCode = passing ? 0 : 1;
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
