import { injectable, inject } from "tsyringe";
import { checkHumanName as humanCheckName, Rule, RuleCheck, ruleHumanName as humanRuleName } from "./Rule";
import { AssertionError } from "assert";
import './rules';
import { ProductService } from "./services/ProductService";

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

        for(const rule of this.rules) {
            const humanRuleNameVal = humanRuleName(rule);
            console.error(humanRuleNameVal);

            for(const [checkName, checkFunc] of this.listChecks(rule)) {
                const humanCheckNameVal = humanCheckName(checkName);
                let outcome = 'PASS';
                let message = null;

                try {
                    await checkFunc.call(rule, product);
                } catch (e) {
                    if (e instanceof AssertionError) {
                        outcome = 'FAIL';
                    } else {
                        outcome = 'ERROR';
                    }
                    message = e.message;
                }

                // ${product}
                console.log(`${rule.id}\t${humanRuleNameVal}\t${humanCheckNameVal}\t${outcome}\t${message || ''}`);
            }
        }
    }

    listChecks(rule: any): Map<string,RuleCheck> {
        // there must be a better way to check if a function matches a type signature
        const pairs = Object.keys(rule.__proto__)
            .filter(checkName => checkName.startsWith('check') && checkName != 'check')
            .map((checkName): [string, RuleCheck] => [checkName, rule[checkName]]);
        return new Map(pairs);
    }

}
