import { Product } from './model/Product';
import MongoClient from 'mongodb';
import { getSecretProperty as getSecretConfigEntry } from './Secrets'

const agg = [
  {
      '$match': {
          'dir': 'SOC5KV2'
      }
  }, {
      '$unwind': {
          'path': '$SE7', 
          'preserveNullAndEmptyArrays': false
      }
  }, {
      '$match': {
          'SE7.Lifecycle': 'SeM', 
          'SE7.LifecycleStage': {
              '$in': [
                  'In Model'
              ]
          }
      }
  }, {
      '$lookup': {
          'from': 'envds', 
          'localField': 'dir', 
          'foreignField': 'dir', 
          'as': 'envds'
      }
  }, {
      '$addFields': {
          'envds': {
              '$arrayElemAt': [
                  '$envds', 0
              ]
          }
      }
  }, {
      '$addFields': {
          'EnvProd': {
              '$arrayElemAt': [
                  {
                      '$filter': {
                          'input': '$envds.environments', 
                          'cond': {
                              '$eq': [
                                  '$$this.type', 'Prod'
                              ]
                          }
                      }
                  }, 0
              ]
          }
      }
  }, {
      '$project': {
          '_id': 0, 
          'dir': '$dir', 
          'productId': '$SE7.Key', 
          'productName': '$SE7.Name', 
          'repositories': '$SE7.Repositories.GitHub', 
          'health': '$EnvProd.health'
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
        return rows.flatMap(({ productId, productName, repositories, health }) => {
          if (repositories == null || repositories.length == 0) {
            console.error(`${productName} (${productId}) has no repositories defined`);
            return [];
          }

          return repositories.map((repo: string) =>
            new Product(productId, productName, repo, health)
          ) ?? [];
        });
    } finally {
        client.close();
    }
}
