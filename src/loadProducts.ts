import { Product } from './model/Product';
import MongoClient from 'mongodb';
import { getSecretProperty as getSecretConfigEntry } from './Secrets'

const agg = [
  {
    '$unwind': {
      'path': '$SE7',
      'preserveNullAndEmptyArrays': false
    }
  }, {
    '$match': {
      'SE7.Lifecycle': 'SeM',
      'SE7.LifecycleStage': {
        '$in': [ 'In Model', 'Import' ]
      }
    }
  }, {
    '$project': {
      '_id': 0,
      'productId': '$SE7.Key',
      'productName': '$Product',
      'repositories': '$SE7.Repositories.GitHub'
    }
  }
];

export async function loadProducts(): Promise<Product[]> {
    let engHubUrl = process.env.ENGHUB_URI;
    try {
      engHubUrl ??= await getSecretConfigEntry('enghub', 'uri');
    } catch (error) {
      throw new Error(`No product list, set ENGHUB_URI or login to AWS`)
    }

    const client = await MongoClient.connect(engHubUrl, {
      useNewUrlParser: true, useUnifiedTopology: true
    });
    try {
        const result = await client.db('enghub').collection('products').aggregate(agg);
        const rows = await result.toArray();
        return rows.flatMap(({ productId, productName, repositories }) => {
          if (repositories == null || repositories.length == 0) {
            console.error(`${productName} (${productId}) has no repositories defined`);
            return [];
          }

          return repositories.map((repo: string) =>
            new Product(productId, productName, repo)
          ) ?? [];
        });
    } finally {
        client.close();
    }
}
