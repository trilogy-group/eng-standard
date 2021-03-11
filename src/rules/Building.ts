import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";

import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class Building extends Rule {

    constructor(octokit: Octokit) {
        super(octokit)
    }

    async checkBuildUsesGitHubActionsAndNpm(product: Product) {
        await this.requireWorkflow(product, 'verify');
    }

    async fixBuildUsesGitHubActionsAndNpm(product: Product) {
        await this.fixWorkflow(product, 'verify');
    }

    // TODO: BuildAndTestIsUnder5Minutes
    // async checkBuildAndTestIsUnder5Minutes(product: Product) {
    //     // for every verify GitHub Action run, check that it took less than 5 minutes
    // }

}
