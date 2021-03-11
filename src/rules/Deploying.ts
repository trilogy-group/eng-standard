import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";

import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class Deploying extends Rule {

    constructor(octokit: Octokit) {
        super(octokit)
    }
    
    async checkEveryMergeIsDeployedToProduction(product: Product) {
        await this.requireWorkflow(product, 'deploy-prod')
    }

    // TODO: BlueGreenDeployments
    // async checkBlueGreenDeployments(product: Product) {
    // }

}
