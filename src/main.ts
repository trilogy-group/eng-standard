import * as dotenv from 'dotenv';
dotenv.config();

import 'reflect-metadata';
import { container } from 'tsyringe';
import  './OctokitFactory';
import { ComplianceChecker } from './ComplianceChecker';

// this is for debugging GitHub actions issues
console.log('Environment:');
for(const key in process.env) {
    console.log(`${key}: ${process.env[key]}`);
}
console.log('')

const complianceChecker = container.resolve(ComplianceChecker);
complianceChecker.main();
