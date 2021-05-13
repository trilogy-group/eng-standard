import { _Record, DescribeEndpointsCommand, Dimension, TimestreamWriteClient, WriteRecordsCommand } from "@aws-sdk/client-timestream-write";
import { CheckOptions } from "../check";

import { Result } from "../ComplianceChecker";
import { Product } from "../model/Product";
import { Reporter } from "./Reporter";

export class TimestreamReporter extends Reporter {
  
  private readonly db: string;
  private readonly table: string;
  private readonly metricsTable: string;
  private readonly writerPromise: Promise<TimestreamWriteClient>
  private product!: Product
  private records!: _Record[]
  private metricRecords!: _Record[]

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
    if (process.env.INPUT_TIMESTREAM_METRICS_TABLE == null) throw new Error('INPUT_TIMESTREAM_METRICS_TABLE must be specified');

    const region = process.env.INPUT_TIMESTREAM_REGION as string;
    this.db = process.env.INPUT_TIMESTREAM_DB as string;
    this.table = process.env.INPUT_TIMESTREAM_TABLE as string;
    this.metricsTable = process.env.INPUT_TIMESTREAM_METRICS_TABLE as string;

    this.writerPromise = (async () => {
      const endpoint = await this.getTimestreamEndpoint(region);
      return new TimestreamWriteClient({ endpoint });
    })()
  }

  static enabled(): boolean {
    return process.env.INPUT_TIMESTREAM_DB != null;
  }

  startRun(product: Product) {
    this.product = product;
    this.records = [];
    this.metricRecords = [];
  }

  reportCheck(ruleName: string, checkName: string, checkOptions: CheckOptions, outcome: Result, message?: string) {
    const dimensions = [];
    if (message) {
      dimensions.push({ Name: 'reason', Value: message.replace(/[\/]/g, '_') })
    }

    this.records.push({
      Dimensions: [
        { Name: 'level', Value: 'check' },
        { Name: 'rule', Value: ruleName },
        { Name: 'check', Value: checkName },
        { Name: 'mandatory', Value: String(checkOptions.mandatory) },
        ...dimensions
      ],
      MeasureName: `${ruleName} - ${checkName}`,
      MeasureValue: Result[outcome],
      MeasureValueType: 'VARCHAR'
    });
  }

  reportMetric(ruleName: string, metricName: string, value: number, time?: Date) {
    this.metricRecords.push({
      Dimensions: [
        { Name: 'rule', Value: ruleName }
      ],
      MeasureName: metricName,
      MeasureValue: String(value),
      MeasureValueType: 'DOUBLE',
      Time: String(time?.getTime() ?? Date.now()),
      TimeUnit: 'MILLISECONDS'
    });
  }

  reportRule(ruleName: string, outcome: Result) {
    this.records.push({
      Dimensions: [
        { Name: 'level', Value: 'rule' },
        { Name: 'rule', Value: ruleName }
      ],
      MeasureName: ruleName,
      MeasureValue: Result[outcome],
      MeasureValueType: 'VARCHAR'
    });
  }

  reportRun(product: Product, outcome: Result) {
    this.records.push({
      Dimensions: [
        { Name: 'level', Value: 'repo' }
      ],
      MeasureName: 'repo',
      MeasureValue: Result[outcome],
      MeasureValueType: 'VARCHAR'
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

    const complianceCmd = new WriteRecordsCommand({
      DatabaseName: this.db,
      TableName: this.table,
      Records: this.records,
      CommonAttributes: {
        Dimensions: dimensions,
        Time: Date.now().toString()
      }
    });

    const metricsCmd = new WriteRecordsCommand({
      DatabaseName: this.db,
      TableName: this.metricsTable,
      Records: this.metricRecords,
      CommonAttributes: {
        Dimensions: dimensions
      }
    });

    try {
      const writer = await this.writerPromise;
      await Promise.all([
        writer.send(complianceCmd),
        writer.send(metricsCmd)
      ])
    } catch (error) {
      console.error('Error writing to Timestream', error);
    }
  }

}
