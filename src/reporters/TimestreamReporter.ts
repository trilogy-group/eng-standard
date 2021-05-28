import { _Record, WriteRecordsCommand } from "@aws-sdk/client-timestream-write";
import { container, singleton } from "tsyringe";
import { CheckOptions } from "../check";
import { Result } from "../ComplianceChecker";
import { Product } from "../model/Product";
import { getTimestreamWrite } from "../Timestream";
import { Reporter } from "./Reporter";
@singleton()
export class TimestreamReporter extends Reporter {
  
  private readonly db: string;
  private readonly table: string;
  private readonly metricsTable: string;
  private product!: Product
  private records!: _Record[]
  private metricRecords!: _Record[]

  constructor() {
    super();
    this.db = process.env.TIMESTREAM_DB as string;
    this.table = process.env.TIMESTREAM_TABLE as string;
    this.metricsTable = process.env.TIMESTREAM_METRICS_TABLE as string;
  }

  static enabled(): boolean {
    return process.env.TIMESTREAM_DB != null;
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
      { Name: 'product_id', Value: this.product.id },
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
      const writer = await getTimestreamWrite();
      await Promise.all([
        writer.send(complianceCmd),
        writer.send(metricsCmd)
      ])
    } catch (error) {
      console.error('Error writing to Timestream', error);
    }
  }

}

if (TimestreamReporter.enabled()) {
  container.register(Reporter, TimestreamReporter);
}
