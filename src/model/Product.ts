import assert from "assert";

import { BranchProtection, Repo } from "./Repo";

export class Product {

    repo!: Repo;

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly repoId: string,
        public readonly health?: string
    ) {
        if (repoId == null || repoId.length === 0) throw new Error('repoId must not be blank');
    }

    public get mainProtection(): BranchProtection {
        assert(this.repo.mainBranch, 'a main branch must exist');
        assert(this.repo.mainBranch.protection, 'main branch must be protected');
        return this.repo.mainBranch.protection;
    }

    toString(): string {
        return this.repoId || 'new product';
    }

}
