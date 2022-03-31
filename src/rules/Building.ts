import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";
import { check } from "../check";

import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class Building extends Rule {

    buildAndTestRuntime = 15;

    @check({ mandatory: true })
    async checkBuildUsesGitHubActions(product: Product): Promise<void> {
        await this.requireWorkflowExists(product, 'verify')
    }

    @check({ mandatory: false })
    async checkBuildUsesStandardImplementation(product: Product): Promise<void> {
        await this.requireWorkflow(product, 'verify');
    }

    async fixBuildUsesStandardImplementation(product: Product): Promise<void> {
        await this.fixWorkflow(product, 'verify');
    }

    @check({ mandatory: false })
    async checkBuildAndTestIsUnder15Minutes(product: Product): Promise<void> {
        const runs = await this.octokit.actions.listWorkflowRuns({
            owner: product.repo.owner,
            repo: product.repo.name,
            workflow_id: 'verify.yml',
            conclusion: 'neutral',
            per_page: 1
        });

        for(const workflowRun of runs.data.workflow_runs) {
            const jobs = await this.octokit.actions.listJobsForWorkflowRun({
                owner: product.repo.owner,
                repo: product.repo.name,
                run_id: workflowRun.id,
                filter: 'latest'
            });

            const slowestJob = jobs.data.jobs
                .map(job => ({...job, runtime: Math.ceil((Date.parse(job.completed_at as string) - Date.parse(job.started_at)) / 60000.0)}))
                .sort((a,b) => a.runtime - b.runtime)
                .pop();

            if (slowestJob != null) {
                assert(slowestJob.runtime < this.buildAndTestRuntime, `tune ${slowestJob.name.toLowerCase()} to run in less than 15 minutes, currently ${slowestJob.runtime} minutes`)
            }
        }
    }

    @check({ mandatory: true })
    async checkUsesDevspaces(product: Product): Promise<void> {
        await this.requireFileExists(product, '.gitpod.yml',
            'create .gitpod.yml to onboard your repo to DevSpaces')
    }

}
