import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";
import YAML from "yaml";
import { check } from "../check";

import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class Testing extends Rule {

    constructor(octokit: Octokit) {
        super(octokit)
    }

    @check({ mandatory: false })
    async checkCodeAnalysisPassesBeforeMerge(product: Product) {
        this.requireStatusCheck(product, 'Analyze');
    }

    @check({ mandatory: true })
    async checkUnitTestsPassBeforeMerge(product: Product) {
        this.requireStatusCheck(product, 'Test');
    }
    
    @check({ mandatory: true })
    async checkIntegrationTestsPassBeforeMerge(product: Product) {
        this.requireStatusCheck(product, 'Integration test');
    }

    @check({ mandatory: false })
    async checkUnitTestsHaveFullCoverage(product: Product) {
        const whitelist = [ /test/, /buildSrc/, /^build.gradle.kts$/, /^cdk/, /^tools/, /deployment/, /integration/ ]

        // Jest for Typescript projects
        const allJestConfigs = product.repo.fileIndex.filter(file =>
            file.endsWith('jest.config.json') && !whitelist.some(ex => ex.test(file)));
        for (const jestConfigFile of allJestConfigs) {
            const jestConfig = YAML.parse(await this.getRepoFileContent(product, jestConfigFile));
            const cover = jestConfig?.coverageThreshold?.global;
            assert(cover.lines === 100, `set coverageThreshold.global.lines to 100% in ${jestConfigFile}`)
            assert(cover.branches === 100, `set coverageThreshold.global.branches to 100% in ${jestConfigFile}`)
            assert(cover.functions === 100, `set coverageThreshold.global.functions to 100% in ${jestConfigFile}`)
            assert(cover.statements === 100, `set coverageThreshold.global.statements to 100% in ${jestConfigFile}`)
        }

        // Gradle for Java projects
        const allGradleConfigs = product.repo.fileIndex.filter(file =>
            file.endsWith('build.gradle.kts') && !whitelist.some(ex => ex.test(file)));
        for (const configFile of allGradleConfigs) {
            const gradleConfig = await this.getRepoFileContent(product, configFile);
            assert(/limit { counter = "INSTRUCTION"; minimum = BigDecimal.ONE }/.test(gradleConfig),
                `add to ${configFile} instruction test coverage to 100%`)
            assert(/limit { counter = "BRANCH"; minimum = BigDecimal.ONE }/.test(gradleConfig),
                `add to ${configFile} branch test coverage to 100%`)
            assert(/limit { counter = "CLASS"; minimum = BigDecimal.ONE }/.test(gradleConfig),
                `add to ${configFile} class test coverage to 100%`)
            assert(/limit { counter = "METHOD"; minimum = BigDecimal.ONE }/.test(gradleConfig),
                `add to ${configFile} method test coverage to 100%`)
        }

        // ensure we have some test configuration
        assert(allJestConfigs.length > 0 || allGradleConfigs.length > 0,
            'add a test configuration with jest.config.json or build.gradle.kts');
    }

    // TODO: ApiEndpointsAreAllCovered
    // async checkApiEndpointsAreAllCovered() {
    // }

}
