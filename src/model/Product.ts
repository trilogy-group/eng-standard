import assert from "assert";

import { BranchProtection, Repo } from "./Repo";

export class Product {

    public readonly name: string
    public readonly repoId: string
    repo!: Repo;

    constructor(name?: string, repoId?: string) {
        this.name = name ?? process.env.INPUT_PRODUCT_NAME ?? 'unknown';
        this.repoId = repoId ?? process.env.INPUT_REPOSITORY as string;
        if (!this.repoId) throw new Error(`INPUT_REPOSITORY must be specified`);
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
