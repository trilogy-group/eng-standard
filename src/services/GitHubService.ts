import { Octokit } from "@octokit/rest";
import { inject, injectable } from "tsyringe";

import { Repo } from "../model/Repo";

@injectable()
export class GitHubService {

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

            this.octokit.repos.listCommits({ owner, repo: name, branch: 'main', per_page: 1 }).then(response => {
                const tree_sha = response.data[0].commit.tree.sha
                return this.octokit.git.getTree({ owner, repo: name, tree_sha, recursive: 'true' }).then(response => {
                    return response.data.tree.map(f => f.path).filter(p => p != null) as string[]
                })
            }),

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