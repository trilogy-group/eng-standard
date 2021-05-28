import { handler } from './uptime-from-jira.lambda'

handler().catch(error => {
    console.error(error)
    process.exitCode = 1
})
