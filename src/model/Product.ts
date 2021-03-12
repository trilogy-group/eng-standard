import assert from "assert";

import { BranchProtection, Repo } from "./Repo";

export class Product {

    readonly name;

    constructor(
        readonly repo: Repo
    ) {
        this.name = process.env.INPUT_PRODUCT_NAME ?? this.repo.name;
    }

    public get mainProtection(): BranchProtection {
        assert(this.repo.mainBranch, 'a main branch must exist');
        assert(this.repo.mainBranch.protection, 'main branch must be protected');
        return this.repo.mainBranch.protection
    }

    toString(): string {
        return this.repo.id || 'new product';
    }

}
