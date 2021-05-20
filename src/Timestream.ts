import { _Record, TimestreamWrite } from "@aws-sdk/client-timestream-write";

// workaround because timestream endpoint resolution is broken https://github.com/aws/aws-sdk-js-v3/issues/1898
async function getTimestreamEndpoint(region: string): Promise<string> {
    const bootstrapClient = new TimestreamWrite({})
    const { Endpoints } = await bootstrapClient.describeEndpoints({})
    const fallbackAddress = `ingest-cell1.timestream.${region}.amazonaws.com`
    return `https://${ Endpoints?.[0].Address ?? fallbackAddress }`
}

let instance: TimestreamWrite

export async function getTimestreamWrite(): Promise<TimestreamWrite> {
    if (instance != null) return instance;

    if (process.env.TIMESTREAM_REGION == null) throw new Error('TIMESTREAM_REGION must be specified');
    const region = process.env.TIMESTREAM_REGION as string;
    
    const endpoint = await getTimestreamEndpoint(region);
    instance = new TimestreamWrite({ endpoint });
    return instance
}
