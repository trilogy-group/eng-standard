import { Octokit } from "@octokit/rest";
import assert from "assert";
import { container } from 'tsyringe';

import { Product } from "./model/Product";

export class Rule {

    readonly repair = process.env.repair == 'true';

    constructor() {
    }

    protected get octokit(): Octokit {
        return container.resolve<Octokit>(Octokit)
    }

    private get octokitAdmin(): Octokit {
        return container.resolve<Octokit>('OctokitAdmin')
    }

    async requireFileExists(product: Product, fileName: string, message?: string): Promise<void> {
        try {
            await this.getRepoFileContent(product, fileName);
        } catch (error) {
            assert(false, message ?? `add file ${fileName}`)
        }
    }

    async requireWorkflowExists(product: Product, workflowFileName: string): Promise<string> {
        const workflowFilePath = `.github/workflows/${workflowFileName}.yml`;
        const workflow = product.repo.workflows.find(workflow => workflow.path == workflowFilePath);
        assert(workflow, `add workflow ${workflowFileName}.yml from the template`);
        return workflowFilePath;
    }

    async requireWorkflow(product: Product, workflowFileName: string, hashes?: string[]): Promise<void> {
        const workflowFilePath = await this.requireWorkflowExists(product, workflowFileName);
        const workflowFile = await this.getRepoFile(product, workflowFilePath);

        if (hashes != null) {
            // if hashes are supplied, check that it matches the hashes
            assert(hashes.includes(workflowFile.sha), `update workflow ${workflowFileName}.yml to match the template`);
        } else {
            // else check that it matches the template
            const templateContent = await this.getTemplateFileContent(workflowFilePath);
            assert(workflowFile.content == templateContent, `update workflow ${workflowFileName}.yml to match the template`);
        }
    }

    async fixWorkflow(product: Product, workflowFileName: string): Promise<void> {
        const workflowFilePath = `.github/workflows/${workflowFileName}.yml`;
        const templateContent = await this.getTemplateFileContent(workflowFilePath);

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

    public requireStatusCheck(product: Product, statusCheckName: string): void {
        const checks = product.mainProtection?.required_status_checks?.contexts;
        assert(checks?.includes(statusCheckName), `set pull requests to require that ${statusCheckName} passes`);
    }

    async getTemplateFileContent(filePath: string): Promise<string> {
        const fileContent = await this.getGitHubFileContent(
            this.octokitAdmin, 'trilogy-group', 'eng-template', filePath
        );
        return fileContent.content;
    }

    async getRepoFile(product: Product, filePath: string): Promise<{ content: string, sha: string }> {
        return await this.getGitHubFileContent(
            this.octokit,
            product.repo.owner,
            product.repo.name,
            filePath,
            product.repo.currentBranchName
        );
    }

    async getRepoFileContent(product: Product, filePath: string): Promise<string> {
        const file = await this.getRepoFile(product, filePath);
        return file.content;
    }

    private async getGitHubFileContent(octokit: Octokit, owner: string, repo: string, path: string, ref?: string): Promise<{ content: string, sha: string }> {
        const fileResponse = await octokit.repos.getContent({
            owner, repo, path, ref
        }).then(response => response.data) as {content ?: string, sha ?: string};

        if (fileResponse.content == null) {
            throw new Error(`File ${path} does not exist or could not be accessed`)
        }

        return {
            content: Buffer.from(fileResponse.content, 'base64').toString('utf8'),
            sha: fileResponse.sha as string
        };
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
        .replace(/devspaces/g, 'DevSpaces')
        .replace(/ship every merge/g, 'Ship Every Merge');
}

