import { Octokit } from "@octokit/rest";
import assert from "assert";
import { injectable } from "tsyringe";

import { Product } from "../model/Product";
import { Rule } from "../Rule";

@injectable()
export class Observing extends Rule {

    // TODO: CloudWatchMetricsAreDefinedForAllAwsServices
    // async checkCloudWatchMetricsAreDefinedForAllAwsServices() {
    // }

    // TODO: AlarmsAndActionsAreDefined
    // async checkAlarmsAndActionsAreDefined() {
    // }
    
}
