import { Octokit } from "@octokit/rest";
import { inject, injectable } from "tsyringe";

import { Repo } from "../model/Repo";

@injectable()
export class GitHubService {

    INDEXED_FILES = ['jest.config.json', 'build.gradle.kts'];

    constructor(
        @inject(Octokit) private readonly octokit: Octokit
    ) {
        this.octokit = octokit;
    }

    private handleError(e:any) {
        // main missing is handled as undefined
        if (e.status && e.status == 404) {
            return undefined;
        }
        throw e;
    }

    async loadRepository(repoId: string): Promise<Repo> {
        //console.debug(`Loading GitHub information for ${repoId}`);
        const [ owner, name ] = repoId.split('/');

        return Promise.all([

            this.octokit.repos.get({
                owner: owner,
                repo: name
            }).then(response => response.data),
            
            this.octokit.actions.listRepoWorkflows({
                owner: owner,
                repo: name
            }).then(response => response.data.workflows),

            this.octokit.repos.listBranches({
                owner: owner,
                repo: name
            }).then(response => response.data),

            this.octokit.repos.getBranch({
                owner: owner,
                repo: name,
                branch: 'main',
            }).then(response => response.data)
            .catch(this.handleError),

            this.octokit.repos.getBranchProtection({
                mediaType: { previews: [ 'luke-cage' ] },
                owner: owner,
                repo: name,
                branch: 'main',
            }).then(response => response.data)
            .catch(this.handleError),

            this.octokit.search.code({
                q: `repo:${repoId} ` + this.INDEXED_FILES.map(f => `filename:${f}`).join(' '),
            }).then(response => response.data.items.map(file => file.path)),

            this.octokit.actions.listWorkflowRuns({
                owner: owner,
                repo: name,
                workflow_id: 'deploy-prod.yml',
                conclusion: 'neutral'
            }).then(response => response.data.workflow_runs)
            .catch(this.handleError)

        ]).then(([ settings, workflows, branches, mainBranch, mainBranchProtection, fileIndex, prodDeploys ]) =>
            new Repo(owner, name, settings, workflows, branches, mainBranch, mainBranchProtection, fileIndex, prodDeploys)
        );
    }

}