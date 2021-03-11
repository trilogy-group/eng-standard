import { AssertionError } from "assert";
import Chalk from 'chalk';
import { inject, injectable } from "tsyringe";

import { checkHumanName as humanCheckName, ruleHumanName as humanRuleName, Rule, RuleCheck } from "./Rule";
import { ProductService } from "./services/ProductService";

import './rules';

const RESULT_PASS = Chalk.green('✓');
const RESULT_ERROR = Chalk.red('!');
const RESULT_FAIL = Chalk.red('✗');

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
        let product = await this.productService.loadProduct(branch);

        let passing = true;
        for(const rule of this.rules) {
            const humanRuleNameVal = humanRuleName(rule);
            console.log(`\n${humanRuleNameVal}`);

            for(const [checkName, checkFunc] of this.listChecks(rule)) {
                const humanCheckNameVal = humanCheckName(checkName).toLowerCase();
                const fixFunc = Reflect.get(rule, checkName.replace('check', 'fix'));

                let outcome = null;
                let message = null;
                for(let attempt = 0; outcome == null; attempt++) {
                    // check the status
                    try {
                        await checkFunc.call(rule, product);
                        outcome = RESULT_PASS;
                    } catch (error) {
                        if (error instanceof AssertionError) {
                            outcome = RESULT_FAIL;
                            message = error.message;
                        } else {
                            outcome = RESULT_ERROR;
                            message = `${humanCheckNameVal}: ${error.message}`;
                        }
                    }

                    // try to repair it
                    if (attempt == 0 && outcome != RESULT_PASS && doRepair && fixFunc) {
                        try {
                            await fixFunc.call(rule, product);
                            product = await this.productService.loadProduct(branch);
                            outcome = null;
                            message = null;
                        } catch (repairError) {
                            message += ` and repair failed with ${repairError}`;
                        }
                    }
                }

                console.log(`${outcome} ${message || humanCheckNameVal}`);
                passing &&= (outcome == RESULT_PASS);
            }
        }

        console.log(`\nResult: ${Chalk.inverse(passing ? Chalk.green('PASS') : Chalk.red('FAIL'))}`);
        if (!passing && doRepair) {
            console.log('trilogy-eng-standards needs admin access on your repository to fix most issues');
        }
        console.log('');
        process.exitCode = passing ? 0 : 1;
    }

    listChecks(rule: any): Map<string,RuleCheck> {
        // there must be a better way to check if a function matches a type signature
        const pairs = Object.keys(rule.__proto__)
            .filter(checkName => checkName.startsWith('check') && checkName != 'check')
            .map((checkName): [string, RuleCheck] => [checkName, rule[checkName]]);
        return new Map(pairs);
    }

}
