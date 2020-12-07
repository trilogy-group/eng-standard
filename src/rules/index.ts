import { container } from "tsyringe";
import { TrunkBasedDevelopment } from "./TrunkBasedDevelopment";
import { MainIsAlwaysReleasable } from "./MainIsAlwaysReleasable";

container.register('rules', { useValue: [
    container.resolve(TrunkBasedDevelopment),
    container.resolve(MainIsAlwaysReleasable)
]});
