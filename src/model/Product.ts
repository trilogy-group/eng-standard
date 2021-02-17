import { Repo } from "./Repo";

export class Product {

    constructor(
        readonly repo: Repo,
        readonly branch: string
    ) {
    }

    toString(): string {
        return this.repo.id || 'new product';
    }

}
