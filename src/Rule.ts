import { Product } from "./model/Product";
import { Octokit } from "@octokit/rest";
import assert from "assert";
import { AssertionError } from "assert";
import fs from "fs";
import path from "path";

async function assertOrFix(value: any, message: string, repair:() => Promise<void>): Promise<void> {
    const doRepair = process.env.repair == 'true';
    try {
        assert(value, message);
    } catch (assertError) {
        if (assertError instanceof AssertionError && doRepair) {
            try {
                await repair();
            } catch (repairError) {
                assertError.message = `${message} and repair failed with ${repairError}`;
            }
        }
        throw assertError;
    }
}

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

        const appFileName = require.main?.filename;
        if (!appFileName) throw new Error('Cannot determine project location, require.main is undefined');
        const appDir = path.dirname(path.dirname(appFileName));
        const templateContent = fs.readFileSync(`${appDir}/template/${workflowFilePath}`, { encoding: 'utf8' });

        const workflow = product.repo.workflows.find(workflow => workflow.path == workflowFilePath);
        await assertOrFix(workflow, `${workflowFileName} workflow must be defined`, async () => {
            await this.updateFile({
                product: product,
                path: workflowFilePath,
                content: templateContent
            });
        });

        // use any because the types are broken: cannot handle both array and singular types
        const workflowFile:any = await this.octokit.repos.getContent({
            owner: product.repo.owner,
            repo: product.repo.name,
            path: workflowFilePath
        }).then(response => response.data);

        // check that it matches the one in the SEM template
        const workflowContent = Buffer.from(workflowFile.content, 'base64').toString('utf8');
        await assertOrFix(workflowContent == templateContent,
                `workflow ${workflowFileName}.yml must match the template`,
                async () => {
            await this.updateFile({
                product: product,
                path: workflowFilePath,
                content: templateContent,
                sha: workflowFile.sha
            });
        });
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

