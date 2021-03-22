import { components } from "@octokit/openapi-types";

export type FullRepository = components["schemas"]["full-repository"]
export type Workflow = components["schemas"]["workflow"];
export type BranchShort = components["schemas"]["branch-short"];
export type BranchWithProtection = components["schemas"]["branch-with-protection"];
export type BranchProtection = components["schemas"]["branch-protection"];

export class Repo {

    readonly id: string;
    readonly currentBranchName: string;

    constructor(
        readonly owner: string,
        readonly name: string,
        readonly settings: FullRepository,
        readonly workflows: Workflow[],
        readonly branches: BranchShort[],
        readonly mainBranch: BranchWithProtection | undefined,
        readonly mainBranchProtection: BranchProtection | undefined,
        readonly keyFiles: string[]
    ) {
        this.id = `${owner}/${name}`;
        this.owner = owner;
        this.name = name;
        this.settings = settings;
        this.workflows = workflows.filter(workflow => workflow.state === 'active');
        this.branches = branches;
        this.mainBranch = mainBranch;
        this.currentBranchName = process.env.INPUT_BRANCH ?? 'main';

        // attributes are missing unless we get protection separately
        if (mainBranch && mainBranchProtection) {
            mainBranch.protection = mainBranchProtection;
        }
    }

}