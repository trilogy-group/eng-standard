import { Product } from "./model/Product";
import { Octokit } from "@octokit/rest";
import assert from "assert";
import fs from "fs";

export abstract class Rule {

    abstract readonly id: string;

    constructor(
        protected readonly octokit: Octokit
    ) {
        this.octokit = octokit;
    }

    async requireWorkflow(product: Product, workflowFileName: string) {
        const workflow = product.repo.workflows.find(workflow =>
            workflow.path == `.github/workflows/${workflowFileName}.yml`);
        assert(workflow, `${workflowFileName} workflow must be defined`);

        // use any because the types are broken: cannot handle both array and singular types
        const workflowFile:any = await this.octokit.repos.getContent({
            owner: product.repo.owner,
            repo: product.repo.name,
            path: workflow.path
        }).then(response => response.data);

        const workflowContent = Buffer.from(workflowFile.content, 'base64').toString('utf8');
        const templateContent = fs.readFileSync(`template/${workflow.path}`, { encoding: 'utf8' });

        // check that it matches the one in the SEM template
        assert(workflowContent == templateContent,
            `GitHub workflow ${workflowFileName}.yml must match the template`);
    
        return workflow;
    }

}

export interface RuleCheck {
    (product: Product): Promise<void>
}

function camelToHuman(camelStr: string) {
    return camelStr.replace(/(?=[A-Z])/g, ' ').trim();
}

export function ruleHumanName(rule: Rule) {
    return camelToHuman(rule.constructor.name);
}

export function checkHumanName(functionName: string) {
    return camelToHuman(functionName.replace('check', ''));
}

