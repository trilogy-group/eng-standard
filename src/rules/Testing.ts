import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";

import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class Testing extends Rule {

    constructor(octokit: Octokit) {
        super(octokit)
    }

    async checkChecksShipEveryMergeCompliance(product: Product) {
        await this.requireWorkflow(product, 'engineering-standards');
    }

    async fixChecksShipEveryMergeCompliance(product: Product) {
        await this.fixWorkflow(product, 'engineering-standards');
    }

    async checkCodeAnalysisPassesBeforeMerge(product: Product) {
        this.requireStatusCheck(product, 'Code analysis', 'must check that static code analysis passes');
    }

    async checkUnitTestsPassBeforeMerge(product: Product) {
        this.requireStatusCheck(product, 'Unit test', 'must check that unit tests pass');
    }
    
    async checkIntegrationTestsPassBeforeMerge(product: Product) {
        this.requireStatusCheck(product, 'Integration test', 'must check that integration tests pass');
    }

    // TODO: UnitTestsHaveFullCoverage
    // async checkUnitTestsHaveFullCoverage() {
    // }

    // TODO: ApiEndpointsAreAllCovered
    // async checkApiEndpointsAreAllCovered() {
    // }

}
