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
        await this.requireWorkflow(product, 'rebase');
    }

    async fixPullRequestsAreAlwaysReadyToMerge(product: Product) {
        await this.fixWorkflow(product, 'rebase');
    }

    async checkDoContinuousIntegrationBeforeMerge(product: Product) {
        await this.requireWorkflow(product, 'verify');
    }

    async fixDoContinuousIntegrationBeforeMerge(product: Product) {
        await this.fixWorkflow(product, 'verify');
    }

    async checkPullRequestsMustBeReviewed(product: Product) {
        assert(product.repo.mainBranch, 'a main branch must exist');
        
        const mainBranchProtection = product.repo.mainBranch.protection;
        assert(mainBranchProtection, 'main branch must be protected');
        assert(mainBranchProtection.required_linear_history?.enabled,
            'main branch must have linear commit history');
        
        const mainBranchProtectionReviews = mainBranchProtection.required_pull_request_reviews;
        assert(mainBranchProtectionReviews,
            'main branch must require one pull request review before merging');
        assert(mainBranchProtectionReviews.required_approving_review_count,
            'main branch must require one pull request review before merging');
        assert(mainBranchProtectionReviews.required_approving_review_count > 0,
            'main branch must require one pull request review before merging');
        assert(mainBranchProtectionReviews.dismiss_stale_reviews,
            'main branch must be set to dismiss stale reviews');

        const mainBranchProtectionChecks = mainBranchProtection.required_status_checks;
        assert(mainBranchProtectionChecks.contexts.includes('Code analysis'),
            'main branch protection must check code analysis results');
        assert(mainBranchProtectionChecks.contexts.includes('Unit test'),
            'main branch protection must check unit test results');
        assert(mainBranchProtectionChecks.contexts.includes('Integration test'),
            'main branch protection must check integration test results');
    }

    async fixPullRequestsMustBeReviewed(product: Product) {
        await this.octokit.repos.updateBranchProtection({
            mediaType: { previews: [ 'luke-cage' ] },
            owner: product.repo.owner,
            repo: product.repo.name,
            branch: 'refs/heads/main',
            required_status_checks: {
                strict: true,
                contexts: [
                    'Code analysis',
                    'Unit test',
                    'Integration test'
                ]
            },
            // admins must be able to fix compliance issues
            enforce_admins: false,
            required_pull_request_reviews: {
                dismissal_restrictions: {},
                dismiss_stale_reviews: true,
                require_code_owner_reviews: true,
                required_approving_review_count: 1
            },
            restrictions: null,
            required_linear_history: true,
            allow_force_pushes: false,
            allow_deletions: false
        });
    }

}