import * as dotenv from 'dotenv';
dotenv.config();

import YAML from 'yaml';
import 'reflect-metadata';
import { container } from 'tsyringe';
import { Octokit } from "@octokit/rest";
import  './OctokitFactory';

(async () => {
    const octokit = container.resolve(Octokit);

    const productDirResponse = await octokit.repos.getContent({
        owner: 'trilogy-group', repo: 'eng.hub', path: 'Products DS'}) as
        { data: Array<{ name: string, type: string }> };
    
    const productDirs = productDirResponse.data
        .filter(productDir => productDir.type == 'dir')
        .map(productDir => productDir.name);

    const products = productDirs.flatMap(async productDir => {
        console.log(productDir)
        const yamlResponse = await octokit.repos.getContent({
            owner: 'trilogy-group', repo: 'eng.hub', path: `Products DS/${productDir}/product.yaml`}) as
            { data: { content: string } };
        
        if (Array.isArray(yamlResponse.data)) throw new Error(`Products DS/${productDir}/product.yaml is a directory`)

        const yaml = YAML.parse(yamlResponse.data.content);

        return yaml.SE7.array
            .filter(se7 => se7.Lifecycle === 'SeM')
            .map(se7 => ({
                name: se7.Name,
                repo: '...?',
            }));
    })

    products.forEach(product => {
        console.log(`${product.name}\t${product.repo}`)
    })
})()