import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";
import YAML from "yaml";

import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class Testing extends Rule {

    constructor(octokit: Octokit) {
        super(octokit)
    }

    async checkCodeAnalysisPassesBeforeMerge(product: Product) {
        this.requireStatusCheck(product, 'Analyze');
    }

    async checkUnitTestsPassBeforeMerge(product: Product) {
        this.requireStatusCheck(product, 'Test');
    }
    
    async checkIntegrationTestsPassBeforeMerge(product: Product) {
        this.requireStatusCheck(product, 'Integration test');
    }

    async checkUnitTestsHaveFullCoverage(product: Product) {
        const whitelist = [ /test/, /buildSrc/, /^build.gradle.kts$/, /^cdk/, /^tools/, /deployment/, /integration/ ]

        // Jest for Typescript projects
        const allJestConfigs = product.repo.keyFiles.filter(file =>
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
        const allGradleConfigs = product.repo.keyFiles.filter(file =>
            file.endsWith('build.gradle.kts') && !whitelist.some(ex => ex.test(file)));
        for (const configFile of allGradleConfigs) {
            const gradleConfig = await this.getRepoFileContent(product, configFile);
            assert(/limit { counter = "INSTRUCTION"; minimum = BigDecimal.ONE }/.test(gradleConfig),
                `add to ${configFile} test coverage: limit { counter = "INSTRUCTION"; minimum = BigDecimal.ONE }`)
            assert(/limit { counter = "BRANCH"; minimum = BigDecimal.ONE }/.test(gradleConfig),
                `add to ${configFile} test coverage: limit { counter = "BRANCH"; minimum = BigDecimal.ONE }`)
            assert(/limit { counter = "CLASS"; minimum = BigDecimal.ONE }/.test(gradleConfig),
                `add to ${configFile} test coverage: limit { counter = "CLASS"; minimum = BigDecimal.ONE }`)
            assert(/limit { counter = "METHOD"; minimum = BigDecimal.ONE }/.test(gradleConfig),
                `add to ${configFile} test coverage: limit { counter = "METHOD"; minimum = BigDecimal.ONE }`)
        }

        // ensure we have some test configuration
        assert(allJestConfigs.length > 0 || allGradleConfigs.length > 0,
            'add a test configuration with jest.config.json or build.gradle.kts');
    }

    // TODO: ApiEndpointsAreAllCovered
    // async checkApiEndpointsAreAllCovered() {
    // }

}
