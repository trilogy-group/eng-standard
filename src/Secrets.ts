import { SecretsManager } from '@aws-sdk/client-secrets-manager'

const secretsManager = new SecretsManager({})
const secretStrings = new Map<string, string>()

export async function getSecretString(secretKey: string): Promise<string> {
    let cachedSecret = secretStrings.get(secretKey)
    if (cachedSecret == null) {
        const secretId = `eng-standard/${secretKey}`
        const secret = await secretsManager.getSecretValue({ SecretId: secretId })
        if (secret == null) throw new Error(`Cannot find secret ${secretId}`)
        cachedSecret = secret.SecretString
        if (cachedSecret == null) throw new Error(`Secret ${secretId} is not a string`)
        secretStrings.set(secretKey, cachedSecret)
    }
    return cachedSecret
}

export async function getSecretObject(secretKey: string): Promise<any> {
    return JSON.parse(await getSecretString(secretKey))
}

export async function getSecretProperty(secretKey: string, key: string): Promise<string> {
    return (await getSecretObject(secretKey))[key]
}
