import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";

import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class Reviewing extends Rule {

    constructor(octokit: Octokit) {
        super(octokit)
    }

    async checkPullRequestsMustBeReviewed(product: Product) {
        const reviews = product.mainProtection.required_pull_request_reviews;
        assert(reviews,
            'main branch must require one pull request review before merging');
        assert(reviews.required_approving_review_count,
            'main branch must require one pull request review before merging');
        assert(reviews.required_approving_review_count > 0,
            'main branch must require one pull request review before merging');
        assert(reviews.dismiss_stale_reviews,
            'main branch must be set to dismiss stale reviews');
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
