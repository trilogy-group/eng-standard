import { injectable } from "tsyringe";
import assert from "assert";
import { Product } from "../model/Product";
import { Rule } from "../Rule";
import { Octokit } from "@octokit/rest";

@injectable()
export class TrunkBasedDevelopment extends Rule {

    readonly id = 'ITD.BRANCH.1';
    readonly maxBranchAge = 48; // hours

    constructor(octokit: Octokit) {
        super(octokit)
    }

    async checkOneMainBranch(product: Product) {
        const mainBranch = product.repo.mainBranch;
        assert(mainBranch, 'a main branch must exist');

        const otherProtected = product.repo.branches.some(branch =>
            branch.protected && branch.name != mainBranch.name);
        assert(!otherProtected, 'the main branch must be the only protected branch');
    }

    async checkLinearCommitHistory(product: Product) {
        assert(product.repo.settings.allow_squash_merge,
            'squash merge is disabled - squash merge must be the only merge type');
        assert(product.repo.settings.allow_squash_merge,
            'merge commit is enabled - squash merge must be the only merge type');
        assert(product.repo.settings.allow_rebase_merge,
            'rebase merge is enabled - squash merge must be the only merge type');
    }

    async fixLinearCommitHistory(product: Product) {
        await this.octokit.repos.update({
            owner: product.repo.owner,
            repo: product.repo.name,
            delete_branch_on_merge: true
        });
    }

    async checkDeleteBranchAfterPullRequestMerged(product: Product) {
        assert(product.repo.settings.delete_branch_on_merge,
            'delete branch on merge must be set');
    }

    async fixDeleteBranchAfterPullRequestMerged(product: Product) {
        await this.octokit.repos.update({
            owner: product.repo.owner,
            repo: product.repo.name,
            delete_branch_on_merge: true
        });
    }

    async checkOnlyShortLivedBranches(product: Product) {
        const mainBranch = product.repo.mainBranch;
        assert(mainBranch, 'a main branch must exist');

        const unprotectedBranches = product.repo.branches.filter(branch =>
            !branch.protected && branch.name != mainBranch.name);
        
        const earliestBranchAge = new Date();
        earliestBranchAge.setHours(earliestBranchAge.getHours() - this.maxBranchAge);

        for(const branch of unprotectedBranches) {
            assert(branch.name, 'all branches must be named');

            const diff = await this.octokit.repos.compareCommits({
                owner: product.repo.owner,
                repo: product.repo.name,
                base: mainBranch.name,
                head: branch.name
            }).then(response => response.data);

            // if branch has no commits, skip it
            if (diff.commits.length == 0) {
                return;
            }

            const commitDate = diff.commits[0].commit.committer?.date;
            if (commitDate) {
                const branchCreationDate = new Date(commitDate);
                assert(branchCreationDate >= earliestBranchAge,
                    `branch ${branch.name} is more than ${this.maxBranchAge} hours old`);
            }
        }
    }

    async checkHasSemComplianceGithubCheck(product: Product) {
        await this.requireWorkflow(product, 'engineering-standards');
    }

    async fixHasSemComplianceGithubCheck(product: Product) {
        await this.fixWorkflow(product, 'engineering-standards');
    }

}