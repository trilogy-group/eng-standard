import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";
import { check } from "../check";

import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class Reviewing extends Rule {

    constructor(octokit: Octokit) {
        super(octokit)
    }

    @check({ mandatory: true })
    async checkEngineeringStandardsAreEnforced(product: Product): Promise<void> {
        await this.requireWorkflow(product, 'engineering-standards');
        this.requireStatusCheck(product, 'Enforce standards');
    }

    @check({ mandatory: true })
    async checkPullRequestsMustBeReviewed(product: Product): Promise<void> {
        const reviews = product.mainProtection.required_pull_request_reviews;
        assert(reviews,
            'enable pull request reviews on main branch');
        // without admin access GitHub hides the review rules from the API so we can't tell if it's set or not
        assert(reviews.required_approving_review_count,
            'set pull request reviews on main branch to require at least one approval and grant trilogy-eng-standards admin access to your repo');
        assert(reviews.required_approving_review_count > 0,
            'set pull request reviews on main branch to require at least one approval');
    }

    // async fixPullRequestsMustBeReviewed(product: Product) {
    //     await this.octokit.repos.updateBranchProtection({
    //         mediaType: { previews: [ 'luke-cage' ] },
    //         owner: product.repo.owner,
    //         repo: product.repo.name,
    //         branch: 'refs/heads/main',
    //         required_status_checks: {
    //             strict: true,
    //             contexts: [
    //                 'Code analysis',
    //                 'Unit test',
    //                 'Integration test'
    //             ]
    //         },
    //         // admins must be able to fix compliance issues
    //         enforce_admins: false,
    //         required_pull_request_reviews: {
    //             dismissal_restrictions: {},
    //             dismiss_stale_reviews: true,
    //             require_code_owner_reviews: true,
    //             required_approving_review_count: 1
    //         },
    //         restrictions: null,
    //         required_linear_history: true,
    //         allow_force_pushes: false,
    //         allow_deletions: false
    //     });
    // }

}
