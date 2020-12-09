import { Octokit } from "@octokit/rest";
import { injectable } from "tsyringe";
import { Repo } from "../model/Repo";

@injectable()
export class GitHubService {
    
    constructor(
        private readonly octokit: Octokit
    ) {
        this.octokit = octokit;
    }

    async loadRepository(): Promise<Repo> {
        const repoId = process.env.INPUT_REPOSITORY;
        if (!repoId) throw new Error(`INPUT_REPOSITORY must be specified`);

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
            .catch(e => {
                // main missing is handled as undefined
                if (e.status && e.status == 404) {
                    return undefined;
                }
                throw e;
            })

        ]).then(([ settings, workflows, branches, mainBranch ]) =>
            new Repo(owner, name, settings, workflows, branches, mainBranch)
        );
    }

}