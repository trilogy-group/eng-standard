import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";
import { check } from "../check";

import { Product } from "../model/Product";
import { MetricWriter, Rule } from "../Rule";

@injectable()
export class Deploying extends Rule {

    constructor(octokit: Octokit) {
        super(octokit)
    }
    
    @check({ mandatory: true })
    async checkEveryMergeIsDeployedToProduction(product: Product): Promise<void> {
        await this.requireWorkflowExists(product, 'deploy-prod')
    }

    @check({ mandatory: false })
    async checkDeployUsesStandardImplementation(product: Product): Promise<void> {
        await this.requireWorkflow(product, 'deploy-prod')
    }

    // TODO: BlueGreenDeployments
    // async checkBlueGreenDeployments(product: Product) {
        // is this implied by using deploy-prod and eng-base-ts?
        // we know Sococo is using these, but doesn't actually have blue-green
        // to differentiate, we need to interrogate the blue-green analytics database
    // }

    async metricRelease(product: Product, metrics: MetricWriter): Promise<void> {
        product.repo.prodDeploys?.forEach(deploy => {
            // conclusion can be: action_required, cancelled, failure, neutral, success, skipped, stale, or timed_out.
            // ignore when a deployment was not even attempted or is incomplete
            if (deploy.conclusion === 'skipped') return
            if (deploy.conclusion === 'action_required') return

            metrics.report(deploy.conclusion === 'success' ? 1 : 0, new Date(deploy.created_at))
        })
    }

}
