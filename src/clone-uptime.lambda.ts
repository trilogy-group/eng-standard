import fetch from 'node-fetch'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import { getSecretObject } from './Secrets'
import { loadProducts } from './loadProducts'
import { getTimestreamWrite } from './Timestream'

dayjs.extend(utc)
dayjs.extend(weekOfYear)

function endOfWeek(w: number, y: number): Date {
    return dayjs(`${y}-01-01`).utc(true).week(w).endOf('week').toDate()
}

export const handler = async () => {
    const db = process.env.TIMESTREAM_DB as string
    const replicaTable = process.env.TIMESTREAM_UPTIME_TABLE as string
    if (db == null) throw new Error('TIMESTREAM_DB must be specified')
    if (replicaTable == null) throw new Error('TIMESTREAM_UPTIME_TABLE must be specified')

    const config = await getSecretObject('uptime-db');
    const products = await loadProducts();

    const query = `
        select project, /:W/
        from products_uptime_5
        where contributor = 'Uptime'
        fill(100)
    `.replace(/\s{2,}/, ' ').trim()

    const authToken = Buffer.from(config.username + ':' + config.password).toString('base64')

    const response = await fetch(`${config.uri}/query?db=${config.db}&q=${encodeURIComponent(query)}&epoch=ms`, {
        headers: {
            Authorization: 'Basic ' + authToken
        }
    }).then(res => res.json())

    const series = response.results[0].series[0]
    const projectCol = series.columns.indexOf('project')

    const minDate = dayjs().utc(true).subtract(365, 'days').toDate()
    const maxDate = new Date()

    const weekCols = series.columns.flatMap((colName: string, col: number) => {
        const matches = colName.match(/(\d{4}):W(\d+)/)
        if (matches == null) return []
        const year = Number(matches[1])
        const week = Number(matches[2])
        const date = endOfWeek(week, year)
        if (date < minDate || date > maxDate) return []
        return { col, date }
    }) as Array<{col: number, date: Date}>

    const records: any[] = series.values.flatMap((row: any) => {
        const productKey = row[projectCol]

        const dimensions = [
            { Name: 'product_id', Value: productKey }
        ]

        const product = products.find(p => p.id == productKey)
        if (product != null) {
            dimensions.push({ Name: 'product', Value: product.name })
        }

        return weekCols.map(col => ({
            Dimensions: dimensions,
            Time: String(col.date.getTime()),
            TimeUnit: 'MILLISECONDS',
            MeasureName: 'uptime',
            MeasureValue: String(row[col.col] / 100.0),
            MeasureValueType: 'DOUBLE',
            Version: Date.now()
        }))
    })

    const writer = await getTimestreamWrite()
    const batchSize = 100
    for(let i=0; i<records.length; i+=batchSize) {
        const recordBatch = records.slice(i, i + batchSize)
        try {
            await writer.writeRecords({
                DatabaseName: db,
                TableName: replicaTable,
                Records: recordBatch
            })
        } catch (error) {
            throw error
        }
    }
}
