import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";
import { check } from "../check";

import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class Building extends Rule {

    constructor(octokit: Octokit) {
        super(octokit)
    }

    @check({ mandatory: true })
    async checkBuildUsesGitHubActions(product: Product) {
        await this.requireWorkflowExists(product, 'verify')
    }

    @check({ mandatory: false })
    async checkBuildUsesStandardImplementation(product: Product) {
        await this.requireWorkflow(product, 'verify');
    }

    async fixBuildUsesStandardImplementation(product: Product) {
        await this.fixWorkflow(product, 'verify');
    }

    // TODO: BuildAndTestIsUnder5Minutes
    // async checkBuildAndTestIsUnder5Minutes(product: Product) {
    //     // for every verify GitHub Action run, check that it took less than 5 minutes
    // }

}
