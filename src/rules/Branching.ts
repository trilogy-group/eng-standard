import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";

import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class Branching extends Rule {

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

    async checkNoDevelopBranch(product: Product) {
        const developBranch = product.repo.branches.find(branch => branch.name == 'develop')
        assert(developBranch == null, 'there must be no develop branch')
    }

    // TODO: NoFixBranchesOlderThanOneDay
    // async checkNoFixBranchesOlderThanOneDay(product: Product) {
    // }

    // TODO: PullRequestsMergeToMain
    // async checkPullRequestsMergeToMain(product: Product) {
    // }

    // Don't do this, because it'll fail every time a merge happens and that's ok
    // async checkPullRequestsUpToDate(product: Product) {
    // }

    // Don't do this for products in development, because PCAs also need to make changes
    // async checkBranchesFollowNamingConvention(product: Product) {
    // }

    async checkLinearCommitHistory(product: Product) {
        assert(product.repo.settings.allow_squash_merge == true,
            'squash merge is disabled - squash merge must be the only merge type');
        assert(product.repo.settings.allow_merge_commit == false,
            'merge commit is enabled - squash merge must be the only merge type');
        assert(product.repo.settings.allow_rebase_merge == false,
            'rebase merge is enabled - squash merge must be the only merge type');
    }

    async fixLinearCommitHistory(product: Product) {
        await this.octokit.repos.update({
            owner: product.repo.owner,
            repo: product.repo.name,
            allow_squash_merge: true,
            allow_merge_commit: false,
            allow_rebase_merge: false,
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

}
