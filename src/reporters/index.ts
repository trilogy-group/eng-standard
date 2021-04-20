import { container } from "tsyringe";

import { ConsoleReporter } from './ConsoleReporter';
import { MultiReporter } from './MultiReporter';
import { Reporter } from "./Reporter";
import { TimestreamReporter } from './TimestreamReporter';

const reporters: Reporter[] = [ new ConsoleReporter() ]
if (TimestreamReporter.enabled()) {
    reporters.push(new TimestreamReporter())
}
const defaultReporter = new MultiReporter(reporters)

container.register('reporter', { useValue: defaultReporter });