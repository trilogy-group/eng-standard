import { handler } from './clone-uptime.lambda'

handler().catch(error => {
    console.error(error)
    process.exitCode = 1
})
