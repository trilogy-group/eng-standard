import { Product } from "./model/Product";
import { Octokit } from "@octokit/rest";
import fs from "fs";
import path from "path";
import assert from "assert";

export abstract class Rule {

    abstract readonly id: string;
    readonly repair: boolean;

    constructor(
        protected readonly octokit: Octokit
    ) {
        this.octokit = octokit;
        this.repair = process.env.repair == 'true';
    }

    async requireWorkflow(product: Product, workflowFileName: string): Promise<void> {
        const workflowFilePath = `.github/workflows/${workflowFileName}.yml`;

        const workflow = product.repo.workflows.find(workflow => workflow.path == workflowFilePath);
        assert(workflow, `workflow ${workflowFileName}.yml must be defined`);

        // get the workflow file contents
        // use any because the types are broken: cannot handle both array and singular types
        const workflowFile:any = await this.octokit.repos.getContent({
            owner: product.repo.owner,
            repo: product.repo.name,
            path: workflowFilePath
        }).then(response => response.data);
        const workflowContent = Buffer.from(workflowFile.content, 'base64').toString('utf8');
        const templateContent = this.getTemplateFileContent(workflowFilePath);

        // check that it matches the template
        assert(workflowContent == templateContent, `workflow ${workflowFileName}.yml must match the template`);
    }

    async fixWorkflow(product: Product, workflowFileName: string): Promise<void> {
        const workflowFilePath = `.github/workflows/${workflowFileName}.yml`;
        const templateContent = this.getTemplateFileContent(workflowFilePath);

        // we need the existing file for the sha check
        const workflowFile:any = await this.octokit.repos.getContent({
            owner: product.repo.owner,
            repo: product.repo.name,
            path: workflowFilePath
        }).then(response => response.data);

        // update the workflow file
        await this.updateFile({
            product: product,
            path: workflowFilePath,
            content: templateContent,
            sha: workflowFile.sha
        });
    }

    private getTemplateFileContent(workflowFilePath: string) {
        const appFileName = require.main?.filename;
        if (!appFileName) throw new Error('Cannot determine project location, require.main is undefined');
        const appDir = path.dirname(path.dirname(appFileName));
        return fs.readFileSync(`${appDir}/template/${workflowFilePath}`, { encoding: 'utf8' });
    }

    async updateFile(options: { product: Product; path: string; content: string; sha?: string; }): Promise<void> {
        await this.octokit.repos.createOrUpdateFileContents({
            owner: options.product.repo.owner,
            repo: options.product.repo.name,
            message: `Update to Engineering Standards`,
            path: options.path,
            content: Buffer.from(options.content).toString('base64'),
            sha: options.sha
        });
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

