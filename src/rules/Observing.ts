import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";

import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class Observing extends Rule {

    constructor(octokit: Octokit) {
        super(octokit)
    }

    // TODO: CloudWatchMetricsAreDefinedForAllAwsServices
    // async checkCloudWatchMetricsAreDefinedForAllAwsServices() {
    // }

    // TODO: AlarmsAndActionsAreDefined
    // async checkAlarmsAndActionsAreDefined() {
    // }
    
}
