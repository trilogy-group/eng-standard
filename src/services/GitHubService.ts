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
        const repoId = process.env.GITHUB_REPOSITORY;
        if (!repoId) throw new Error(`GITHUB_REPOSITORY must be specified`);

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

            this.octokit.repos.getBranchProtection({
                owner: owner,
                repo: name,
                branch: 'master',
            }).then(response => response.data)
            .catch(e => { console.log(e); throw e; })

        ]).then(([ settings, workflows, branches, mainBranchProtection ]) =>
            new Repo(owner, name, settings, workflows, branches, mainBranchProtection)
        );
    }

}