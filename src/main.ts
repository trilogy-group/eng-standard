import * as dotenv from 'dotenv';

dotenv.config();

import 'reflect-metadata';
import { container } from 'tsyringe';
import  './OctokitFactory';
import { ComplianceChecker } from './ComplianceChecker';
import { Product } from './model/Product';

// this is for debugging GitHub actions
if (process.env.DEBUG) {
    for(const key in process.env) {
        if (key.startsWith('INPUT_')) {
            console.log(`${key}: ${process.env[key]}`);
        }
    }
}

const complianceChecker = container.resolve(ComplianceChecker);
const product = new Product();
complianceChecker.checkProduct(product);
