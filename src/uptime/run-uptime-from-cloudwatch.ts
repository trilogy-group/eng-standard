import { handler } from './uptime-from-cloudwatch.lambda'

handler().catch(error => {
    console.error(error)
    process.exitCode = 1
})
