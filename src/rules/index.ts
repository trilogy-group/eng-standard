import { container } from "tsyringe";
import { Rule } from "../Rule";
import { Branching } from "./Branching";
import { Building } from "./Building";
import { Deploying } from "./Deploying";
import { Observing } from "./Observing";
import { Reviewing } from "./Reviewing";
import { Testing } from "./Testing";

container.register(Rule, Branching);
container.register(Rule, Reviewing);
container.register(Rule, Building);
container.register(Rule, Testing);
container.register(Rule, Deploying);
container.register(Rule, Observing);
