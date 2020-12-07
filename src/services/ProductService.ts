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
        return Promise.all([
            this.gitHubService.loadRepository()
        ]).then(([ repo ]) =>
            new Product(repo)
        );
    }

}