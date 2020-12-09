import { injectable } from "tsyringe";
import assert from "assert";
import { Product } from "../model/Product";
import { Rule } from "../Rule";
import { Octokit } from "@octokit/rest";

@injectable()
export class MainIsAlwaysReleasable extends Rule {

    readonly id = 'ITD.BRANCH.2';

    constructor(octokit: Octokit) {
        super(octokit)
    }

    async checkPullRequestsAreAlwaysReadyToMerge(product: Product) {
        await this.requireWorkflow(product, 'pr-rebase');
    }

    async checkDoContinuousIntegrationBeforeMerge(product: Product) {
        await this.requireWorkflow(product, 'pr-verify');
    }

    async checkPullRequestsMustBeReviewed(product: Product) {
        assert(product.repo.mainBranch, 'a main branch must exist');
        
        const mainBranchProtectionReviews = product.repo.mainBranch.protection.required_pull_request_reviews;
        assert(mainBranchProtectionReviews,
            'main branch must require one pull request review before merging');
        assert(mainBranchProtectionReviews.required_approving_review_count,
            'main branch must require one pull request review before merging');
        assert(mainBranchProtectionReviews.required_approving_review_count > 0,
            'main branch must require one pull request review before merging');
        assert(mainBranchProtectionReviews.dismiss_stale_reviews,
            'main branch must be set to dismiss stale reviews');
    }

}