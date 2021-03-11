import { container } from "tsyringe";

import { Branching } from "./Branching";
import { Building } from "./Building";
import { Deploying } from "./Deploying";
import { Observing } from "./Observing";
import { Reviewing } from "./Reviewing";
import { Testing } from "./Testing";

container.register('rules', { useValue: [
    container.resolve(Branching),
    container.resolve(Reviewing),
    container.resolve(Building),
    container.resolve(Testing),
    container.resolve(Deploying),
    container.resolve(Observing)
]});
