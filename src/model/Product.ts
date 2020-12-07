import { Repo } from "./Repo";

export class Product {

    constructor(
        readonly repo: Repo
    ) {
        this.repo = repo;
    }

    toString(): string {
        return this.repo.id || 'new product';
    }

}
