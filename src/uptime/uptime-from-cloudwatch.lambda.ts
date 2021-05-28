import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { loadProducts } from '../loadProducts'
import { getTimestreamWrite } from '../Timestream'
import { _Record } from '@aws-sdk/client-timestream-write'

dayjs.extend(utc)

export const handler = async () => {
    throw new Error('Not implemented yet')
    // const db = process.env.TIMESTREAM_DB as string
    // const uptimeTable = process.env.TIMESTREAM_UPTIME_TABLE as string
    // if (db == null) throw new Error('TIMESTREAM_DB must be specified')
    // if (uptimeTable == null) throw new Error('TIMESTREAM_UPTIME_TABLE must be specified')

    // const products = await loadProducts();



    // const records: _Record[] = series.values.flatMap((row: any) => {
    //     return weekCols.map(col => ({
    //         Dimensions: [
    //             { Name: 'product_id', Value: productId },
    //             { Name: 'product', Value: productName }
    //         ],
    //         Time: String(col.date.getTime()),
    //         TimeUnit: 'MILLISECONDS',
    //         MeasureName: 'uptime',
    //         MeasureValue: String(row[col.col] / 100.0),
    //         MeasureValueType: 'DOUBLE'
    //     }))
    // })

    // const writer = await getTimestreamWrite()
    // const batchSize = 100
    // for(let i=0; i<records.length; i+=batchSize) {
    //     const recordBatch = records.slice(i, i + batchSize)
    //     try {
    //         await writer.writeRecords({
    //             DatabaseName: db,
    //             TableName: uptimeTable,
    //             Records: recordBatch
    //         })
    //     } catch (error) {
    //         throw error
    //     }
    // }
}
