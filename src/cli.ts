import 'reflect-metadata';
import { container } from 'tsyringe';
import { ComplianceChecker } from './ComplianceChecker';
import { Product } from './model/Product';

async function main() {
    try {
        // display GitHub action parameters
        for(const key in process.env) {
            if (key.startsWith('INPUT_')) {
                console.log(`${key}: ${process.env[key]}`);
            }
        }

        const complianceChecker = container.resolve(ComplianceChecker);

        const repoId = process.env.INPUT_REPOSITORY;
        if (repoId == null) throw new Error('INPUT_REPOSITORY must be specified')

        const productId = process.env.INPUT_PRODUCT_CODE ?? 'UNKNOWN';
        const productName = process.env.INPUT_PRODUCT_NAME ?? 'unknown';

        const product = new Product(productId, productName, repoId);
        await complianceChecker.checkProduct(product);
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
    }
}

main();

