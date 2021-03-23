interface CheckOptions {
    mandatory: boolean
}

export const checks: Record<string, CheckOptions> = {}

export const check = (options: CheckOptions) => (
	_target: Object,
	propertyKey: string
): void => {
    checks[propertyKey] = options
}
