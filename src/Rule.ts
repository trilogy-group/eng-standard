import { Product } from "./model/Product";
import { Octokit } from "@octokit/rest";
import assert from "assert";

export abstract class Rule {

    protected readonly SEM_REPO_OWNER = 'trilogy-group';
    protected readonly SEM_REPO_NAME = 'eng-template';
    abstract readonly id: string;

    constructor(
        protected readonly octokit: Octokit
    ) {
        this.octokit = octokit;
    }

    async requireWorkflow(product: Product, workflowName: string) {
        const workflow = product.repo.workflows.find(workflow => workflow.name == workflowName);
        assert(workflow, `${workflowName} workflow must be defined`);
    
        const workflowFile = await this.octokit.repos.getContent({
            owner: product.repo.owner,
            repo: product.repo.name,
            path: workflow.path
        }).then(response => response.data);
    
        const defaultWorkflowFile = await this.octokit.repos.getContent({
            owner: this.SEM_REPO_OWNER,
            repo: this.SEM_REPO_NAME,
            path: workflow.path
        }).then(response => response.data);
    
        // check that it matches the one in the SEM template
        assert(workflowFile.sha == defaultWorkflowFile.sha,
            `.github/workflows/${workflowName}.yml must match the template`);
    
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

