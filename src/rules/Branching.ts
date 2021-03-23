import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";

import { check } from "../check";
import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class Branching extends Rule {

    readonly maxBranchAge = 72; // hours

    constructor(octokit: Octokit) {
        super(octokit)
    }

    @check({ mandatory: true })
    async checkOneMainBranch(product: Product) {
        const mainBranch = product.repo.mainBranch;
        assert(mainBranch, 'create a main branch');

        const otherProtected = product.repo.branches.find(branch =>
            branch.protected && branch.name != mainBranch.name);
        assert(otherProtected == null, `remove or unprotect branch ${otherProtected?.name}`);
    }

    @check({ mandatory: true })
    async checkNoDevelopBranch(product: Product) {
        const developBranch = product.repo.branches.find(branch => branch.name == 'develop')
        assert(developBranch == null, 'remove the develop branch')
    }

    // TODO: NoFixBranchesOlderThanOneDay
    // async checkNoFixBranchesOlderThanOneDay(product: Product) {
    // }

    // Don't do this, because the review process is too slow so pull requests need to be chained
    // async checkPullRequestsMergeToMain(product: Product) {
    // }

    // Don't do this, because it'll fail every time a merge happens and that's ok
    // async checkPullRequestsUpToDate(product: Product) {
    // }

    // Don't do this for products in development, because PCAs also need to make changes
    // async checkBranchesFollowNamingConvention(product: Product) {
    // }

    @check({ mandatory: false })
    async checkLinearCommitHistory(product: Product) {
        assert(product.repo.settings.allow_squash_merge == true, 'enable squash merge');
        assert(product.repo.settings.allow_merge_commit == false, 'disable merge commit');
        assert(product.repo.settings.allow_rebase_merge == false, 'disable rebase merge');
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

    @check({ mandatory: false})
    async checkDeleteBranchAfterPullRequestMerged(product: Product) {
        assert(product.repo.settings.delete_branch_on_merge,
            'enable delete-branch-on-merge setting');
    }

    async fixDeleteBranchAfterPullRequestMerged(product: Product) {
        await this.octokit.repos.update({
            owner: product.repo.owner,
            repo: product.repo.name,
            delete_branch_on_merge: true
        });
    }

    @check({ mandatory: false })
    async checkOnlyShortLivedBranches(product: Product) {
        const mainBranch = product.repo.mainBranch;
        assert(mainBranch, 'create a main branch');

        const unprotectedBranches = product.repo.branches.filter(branch =>
            !branch.protected && branch.name != mainBranch.name);
        
        const earliestBranchAge = new Date();
        earliestBranchAge.setHours(earliestBranchAge.getHours() - this.maxBranchAge);

        for(const branch of unprotectedBranches) {
            assert(branch.name, 'ensure all branches are named');

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
                    `remove branch ${branch.name} which is older than ${this.maxBranchAge} hours`);
            }
        }
    }

}
