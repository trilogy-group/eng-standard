import { injectable, inject } from "tsyringe";
import { checkHumanName as humanCheckName, Rule, RuleCheck, ruleHumanName as humanRuleName } from "./Rule";
import { AssertionError } from "assert";
import './rules';
import { ProductService } from "./services/ProductService";
import Chalk from 'chalk';
import { exec } from 'child_process';

const RESULT_PASS = Chalk.green('✓');
const RESULT_ERROR = Chalk.red('!');
const RESULT_FAIL = Chalk.red('✗');

@injectable()
export class ComplianceChecker {

    constructor(
        @inject('rules') private readonly rules: Rule[],
        private readonly productService: ProductService
    ) {
        this.rules = rules;
        this.productService = productService;
    }

    async main() {
        const product = await this.productService.loadProduct();

        let passing = true;
        for(const rule of this.rules) {
            const humanRuleNameVal = humanRuleName(rule);
            console.log(`\n${humanRuleNameVal}`);

            for(const [checkName, checkFunc] of this.listChecks(rule)) {
                const humanCheckNameVal = humanCheckName(checkName).toLowerCase();
                let outcome = RESULT_PASS;
                let message = null;

                try {
                    await checkFunc.call(rule, product);
                } catch (e) {
                    passing = false;
                    if (e instanceof AssertionError) {
                        outcome = RESULT_FAIL;
                        message = e.message;
                    } else {
                        outcome = RESULT_ERROR;
                        message = `${humanCheckNameVal}: ${e.message}`;
                    }
                }

                console.log(`${outcome} ${message || humanCheckNameVal}`);

                // CSV output
                //console.log(`${product}\t${rule.id}\t${humanRuleNameVal}\t${humanCheckNameVal}\t${outcome}\t${message || ''}`);
            }
        }

        console.log(`\nResult: ${Chalk.inverse(passing ? Chalk.green('PASS') : Chalk.red('FAIL'))}\n`);
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
