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

    async checkCodeAnalysisPassesBeforeMerge(product: Product) {
        this.requireStatusCheck(product, 'Code analysis');
    }

    async checkUnitTestsPassBeforeMerge(product: Product) {
        this.requireStatusCheck(product, 'Unit test');
    }
    
    async checkIntegrationTestsPassBeforeMerge(product: Product) {
        this.requireStatusCheck(product, 'Integration test');
    }

    // TODO: UnitTestsHaveFullCoverage
    // async checkUnitTestsHaveFullCoverage() {
    // }

    // TODO: ApiEndpointsAreAllCovered
    // async checkApiEndpointsAreAllCovered() {
    // }

}
