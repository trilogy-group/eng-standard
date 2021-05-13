import { Octokit } from "@octokit/rest";
import assert from "assert";
import fs from "fs";
import path from "path";

import { Product } from "./model/Product";

export abstract class Rule {

    readonly repair = process.env.repair == 'true';

    constructor(
        protected readonly octokit: Octokit
    ) {
    }

    async requireWorkflowExists(product: Product, workflowFileName: string): Promise<string> {
        const workflowFilePath = `.github/workflows/${workflowFileName}.yml`;
        const workflow = product.repo.workflows.find(workflow => workflow.path == workflowFilePath);
        assert(workflow, `add workflow ${workflowFileName}.yml from the template`);
        return workflowFilePath;
    }

    async requireWorkflow(product: Product, workflowFileName: string): Promise<void> {
        const workflowFilePath = await this.requireWorkflowExists(product, workflowFileName);
        
        // get the workflow file contents
        const workflowContent = await this.getRepoFileContent(product, workflowFilePath);
        const templateContent = this.getTemplateFileContent(workflowFilePath);

        // check that it matches the template
        assert(workflowContent == templateContent, `update workflow ${workflowFileName}.yml to match the template`);
    }

    async fixWorkflow(product: Product, workflowFileName: string): Promise<void> {
        const workflowFilePath = `.github/workflows/${workflowFileName}.yml`;
        const templateContent = this.getTemplateFileContent(workflowFilePath);

        // we need the existing file for the sha check
        // may be null if the file does not exist or is inaccessible
        const workflowFile:any = await this.octokit.repos.getContent({
            owner: product.repo.owner,
            repo: product.repo.name,
            path: workflowFilePath,
            ref: product.repo.currentBranchName
        })
            .then(response => response.data)
            .catch(_ => null);

        // update the workflow file
        await this.updateFile({
            product: product,
            path: workflowFilePath,
            content: templateContent,
            sha: workflowFile?.sha
        });
    }

    public requireStatusCheck(product: Product, statusCheckName: string) {
        const checks = product.mainProtection?.required_status_checks?.contexts;
        assert(checks?.includes(statusCheckName), `set pull requests to require that ${statusCheckName} passes`);
    }

    private getTemplateFileContent(workflowFilePath: string) {
        const templateDir = this.getTemplateDir()
        return fs.readFileSync(`${templateDir}/${workflowFilePath}`, { encoding: 'utf8' });
    }

    private getTemplateDir(): string {
        let appDir = __dirname;
        while (!fs.existsSync(`${appDir}/template`)) {
            appDir = path.dirname(appDir);
            if (!appDir || appDir === '/') throw new Error('Cannot determine project location');
        }
        return `${appDir}/template`;
    }

    async getRepoFileContent(product: Product, filePath: string) {
        const fileResponse = await this.octokit.repos.getContent({
            owner: product.repo.owner,
            repo: product.repo.name,
            path: filePath,
            ref: product.repo.currentBranchName
        }).then(response => response.data) as {content ?: string};

        if (fileResponse.content == null) {
            throw new Error(`File ${filePath} does not exist or could not be accessed`)
        }

        return Buffer.from(fileResponse.content, 'base64').toString('utf8');
    }

    async updateFile(options: { product: Product; path: string; content: string; sha?: string; }): Promise<void> {
        await this.octokit.repos.createOrUpdateFileContents({
            owner: options.product.repo.owner,
            repo: options.product.repo.name,
            message: `Update to Engineering Standards`,
            path: options.path,
            content: Buffer.from(options.content).toString('base64'),
            sha: options.sha,
            branch: options.product.repo.currentBranchName
        });
    }

}


export interface RuleCheck {
    (product: Product): Promise<void>
}

export interface RuleMetric {
    (product: Product, metrics: MetricWriter): Promise<void>
}

export interface MetricWriter {
    report(value: number, time?: Date): void
}

function camelToHuman(camelStr: string) {
    return camelStr.replace(/((?=[A-Z])|(?<![0-9])(?=[0-9]))/g, ' ').trim();
}

export function ruleHumanName(rule: Rule) {
    return camelToHuman(rule.constructor.name);
}

export function checkHumanName(functionName: string) {
    return camelToHuman(functionName.replace(/^(check|metric|fix)/, ''))
        .toLowerCase()
        .replace(/git hub/g, 'GitHub')
        .replace(/ship every merge/g, 'Ship Every Merge');
}

