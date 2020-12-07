import { injectable } from "tsyringe";
import assert from "assert";
import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class TrunkBasedDevelopment extends Rule {

    readonly id = 'ITD.BRANCH.1';
    readonly maxBranchAge = 48; // hours

    async checkOneMainBranch(product: Product) {
        const mainBranch = product.repo.branches.find(branch => branch.name == 'main');
        const protectedBranches = product.repo.branches.filter(branch => branch.protected);

        assert(mainBranch, 'a main branch must exist');
        assert(mainBranch.protected, 'the main branch must be protected');
        assert(protectedBranches.length == 1, 'the main branch must be the only protected branch');
    }

    async checkValidPullRequestsAreMergedAutomatically(product: Product) {
        await this.requireWorkflow(product, 'auto-merge');
    }

    async checkDeleteBranchAfterPullRequestMerged(product: Product) {
        assert(product.repo.settings.delete_branch_on_merge, 'delete branch on merge is not set');
    }

    async checkOnlyShortLivedBranches(product: Product) {
        const unprotectedBranches = product.repo.branches.filter(branch => !branch.protected);
        const earliestBranchAge = new Date();
        earliestBranchAge.setHours(earliestBranchAge.getHours() - this.maxBranchAge);

        for(const branch of unprotectedBranches) {
            const diff = await this.octokit.repos.compareCommits({
                owner: product.repo.owner,
                repo: product.repo.name,
                base: 'master',
                head: branch.name
            }).then(response => response.data);

            // if branch has no commits, skip it
            if (diff.commits.length == 0) {
                return;
            }

            const branchCreationDate = new Date(diff.commits[0].commit.committer.date);
            assert(branchCreationDate >= earliestBranchAge,
                `branch ${branch.name} is more than ${this.maxBranchAge} hours old`);
        }
    }

    async checkHasSemComplianceGithubCheck(product: Product) {
        await this.requireWorkflow(product, 'engineering-standards');
    }

}