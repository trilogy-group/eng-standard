import { FromCloudFormationPropertyObject } from '@aws-cdk/core/lib/cfn-parse';
import csv from 'csv-parser';
import * as fs from 'fs';

import { Product } from './model/Product';

export function readProducts(productFile: string): Promise<Product[]> {
    const separator = productFile.endsWith('.csv') ? ',' :
        productFile.endsWith('.tsv') ? '\t' :
        undefined;

    if (!separator) throw new Error("product file must be csv or tsv");
    
    return new Promise((resolve, reject) => {
        const products: Product[] = [];

        fs.createReadStream(productFile)
        .pipe(csv({ separator }))
        .on('headers', headers => {
            if (headers[0] != 'name' || headers[1] != 'repo') {
                reject(new Error('headers must be name,repo'));
            }
        }).on('data', row => {
            products.push(new Product(row.name, row.repo));
        }).on('end', () => {
            resolve(products);
        });
    });
}