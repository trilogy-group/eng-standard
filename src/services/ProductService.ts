import { injectable } from "tsyringe";

import { Product } from "../model/Product";
import { GitHubService } from "./GitHubService";

@injectable()
export class ProductService {
    
    constructor(
        private readonly gitHubService: GitHubService
    ) {
        this.gitHubService = gitHubService;
    }

    async loadProduct(): Promise<Product> {
        const repo = await this.gitHubService.loadRepository();
        return new Product(repo);
    }

}