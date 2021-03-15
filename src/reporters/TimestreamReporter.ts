import { _Record, DescribeEndpointsCommand, Dimension, TimestreamWriteClient, WriteRecordsCommand } from "@aws-sdk/client-timestream-write";

import { Result } from "../ComplianceChecker";
import { Product } from "../model/Product";
import { Reporter } from "./Reporter";

export class TimestreamReporter extends Reporter {
  
  private readonly region: string;
  private readonly db: string;
  private readonly table: string;
  private product!: Product
  private records!: _Record[];

  // workaround because timestream endpoint resolution is broken https://github.com/aws/aws-sdk-js-v3/issues/1898
  async getTimestreamEndpoint(region: string): Promise<string> {
      const bootstrapClient = new TimestreamWriteClient({})
      const { Endpoints } = await bootstrapClient.send(new DescribeEndpointsCommand({}))
      const fallbackAddress = `ingest-cell1.timestream.${region}.amazonaws.com`
      return `https://${ Endpoints?.[0].Address ?? fallbackAddress }`
  }

  constructor() {
    super();
    
    if (process.env.INPUT_TIMESTREAM_REGION == null) throw new Error('INPUT_TIMESTREAM_REGION must be specified');
    if (process.env.INPUT_TIMESTREAM_DB == null) throw new Error('INPUT_TIMESTREAM_DB must be specified');
    if (process.env.INPUT_TIMESTREAM_TABLE == null) throw new Error('INPUT_TIMESTREAM_TABLE must be specified');

    this.region = process.env.INPUT_TIMESTREAM_REGION as string;
    this.db = process.env.INPUT_TIMESTREAM_DB as string;
    this.table = process.env.INPUT_TIMESTREAM_TABLE as string;
  }

  static enabled(): boolean {
    return process.env.INPUT_TIMESTREAM_DB != null;
  }

  startRun(product: Product) {
    this.product = product;
    this.records = [];
  }

  reportCheck(ruleName: string, checkName: string, outcome: Result, message?: string) {
    const dimensions = [];
    if (message) {
      dimensions.push({ Name: 'reason', Value: message.replace(/[\/]/g, '_') })
    }

    this.records.push({
      Dimensions: [
        { Name: 'level', Value: 'check' },
        { Name: 'rule', Value: ruleName },
        { Name: 'check', Value: checkName },
        ...dimensions
      ],
      MeasureName: `${ruleName} - ${checkName}`,
      MeasureValue: String(outcome === Result.PASS),
      MeasureValueType: 'BOOLEAN'
    });
  }

  reportRule(ruleName: string, outcome: Result) {
    this.records.push({
      Dimensions: [
        { Name: 'level', Value: 'rule' },
        { Name: 'rule', Value: ruleName }
      ],
      MeasureName: ruleName,
      MeasureValue: String(outcome === Result.PASS),
      MeasureValueType: 'BOOLEAN'
    });
  }

  reportRun(product: Product, outcome: Result) {
    this.records.push({
      Dimensions: [
        { Name: 'level', Value: 'repo' }
      ],
      MeasureName: 'repo',
      MeasureValue: String(outcome === Result.PASS),
      MeasureValueType: 'BOOLEAN'
    });

    this.publishRecords();
  }

  async publishRecords(): Promise<void> {
    const dimensions = [
      { Name: 'product', Value: this.product.name }
    ];
    if (this.product.repo != null) {
      dimensions.push({ Name: 'repo', Value: this.product.repo.name })
    }

    const cmd = new WriteRecordsCommand({
      DatabaseName: this.db,
      TableName: this.table,
      Records: this.records,
      CommonAttributes: {
        Dimensions: dimensions,
        Time: Date.now().toString()
      }
    });

    try {
      const endpoint = await this.getTimestreamEndpoint(this.region);
      const writer = new TimestreamWriteClient({ endpoint });
      writer.send(cmd)
    } catch (error) {
      console.error('Error writing to Timestream', error);
    }
  }

}
