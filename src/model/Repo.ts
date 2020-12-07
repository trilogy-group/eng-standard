import { ReposGetResponseData, ReposListBranchesResponseData, ActionsListRepoWorkflowsResponseData, ReposGetBranchProtectionResponseData } from "@octokit/types";

export type Settings = ReposGetResponseData;
export type Workflow = ActionsListRepoWorkflowsResponseData["workflows"][0];
export type Branch = ReposListBranchesResponseData[0];
export type BranchProtection = ReposGetBranchProtectionResponseData;

export class Repo {

    public readonly id: string;

    constructor(
        readonly owner: string,
        readonly name: string,
        readonly settings: Settings,
        readonly workflows: Workflow[],
        readonly branches: Branch[],
        readonly mainBranchProtection: BranchProtection,
    ) {
        this.id = `${owner}/${name}`;
        this.owner = owner;
        this.name = name;
        this.settings = settings;
        this.workflows = workflows.filter(workflow => workflow.state === 'active');
        this.branches = branches;
        this.mainBranchProtection = mainBranchProtection;
    }

}