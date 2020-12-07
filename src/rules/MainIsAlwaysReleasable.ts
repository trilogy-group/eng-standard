import { injectable } from "tsyringe";
import assert from "assert";
import { Product } from "../model/Product";
import { Rule } from "../Rule";
import YAML from 'yaml';

@injectable()
export class MainIsAlwaysReleasable extends Rule {

    readonly id = 'ITD.BRANCH.2';

    async checkPullRequestsAreAlwaysReadyToMerge(product: Product) {
        await this.requireWorkflow(product, 'auto-rebase');
    }

    async checkDoContinuousIntegrationBeforeMerge(product: Product) {
        await this.requireWorkflow(product, 'integrate');
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