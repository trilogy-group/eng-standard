// reflect-metadata must be first, OctokitFactory must be before other services
import 'reflect-metadata';
import { container } from 'tsyringe';
import  './OctokitFactory';
import { ComplianceChecker } from './ComplianceChecker';
import { Product } from './model/Product';
import { readProducts } from './readProducts';

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
    const name = process.env.INPUT_PRODUCT_NAME ?? 'unknown';
    const repoId = process.env.INPUT_REPOSITORY
    const product = new Product(name, repoId);
    complianceChecker.checkProduct(product);
} else if (process.env.INPUT_PRODUCT_FILE) {
    const productFile = process.env.INPUT_PRODUCT_FILE;
    (async () => {
        for(const product of await readProducts(productFile)) {
            await complianceChecker.checkProduct(product);
        }
    })();
} else {
    console.error('No action, set either INPUT_REPOSITORY or INPUT_PRODUCT_FILE');
    process.exitCode = 1;
}
