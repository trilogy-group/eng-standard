// reflect-metadata must be first, OctokitFactory must be before other services
true; // force the order of imports
import 'reflect-metadata';
import { container } from 'tsyringe';
import  './OctokitFactory';
import { ComplianceChecker } from './ComplianceChecker';
import { Product } from './model/Product';
import { loadProducts } from './loadProducts';

export async function main() {
    try {
        // this is for debugging GitHub actions
        if (process.env.DEBUG) {
            for(const key in process.env) {
                if (key.startsWith('INPUT_')) {
                    console.log(`${key}: ${process.env[key]}`);
                }
            }
        }

        const complianceChecker = container.resolve(ComplianceChecker);

        if (process.env.INPUT_REPOSITORY) {
            const productId = process.env.INPUT_PRODUCT_CODE ?? 'UNKNOWN';
            const productName = process.env.INPUT_PRODUCT_NAME ?? 'unknown';
            const repoId = process.env.INPUT_REPOSITORY
            const product = new Product(productId, productName, repoId);
            await complianceChecker.checkProduct(product);
        } else {
            const products = await loadProducts();
            for(const product of products) {
                await complianceChecker.checkProduct(product);
            }
        }
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
}
