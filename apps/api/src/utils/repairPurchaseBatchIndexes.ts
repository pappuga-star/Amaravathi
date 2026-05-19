import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { AddPurchaseBatch } from '../models/AddPurchaseBatch.js';

function isLegacyUniqueBatchCodeIndex(index: any) {
  return (
    typeof index?.name === 'string' &&
    index?.unique === true &&
    index?.key &&
    Object.keys(index.key).length === 1 &&
    index.key.batchCode === 1
  );
}

function isCorrectPurchaseBatchIdentityIndex(index: any) {
  return (
    index?.unique === true &&
    index?.key &&
    Object.keys(index.key).length === 3 &&
    index.key.purchaseDate === 1 &&
    index.key.sellerName === 1 &&
    index.key.billNumber === 1
  );
}

async function run() {
  await connectDatabase();

  const indexes = await AddPurchaseBatch.collection.indexes();
  const legacyIndexes = indexes.filter(isLegacyUniqueBatchCodeIndex);
  const identityIndex = indexes.find(
    (index) => index.name === 'uniq_purchase_batch_identity',
  );

  for (const index of legacyIndexes) {
    const indexName = String(index.name);
    await AddPurchaseBatch.collection.dropIndex(indexName);
    console.log(`Dropped legacy unique purchase batch index: ${indexName}`);
  }

  if (identityIndex && !isCorrectPurchaseBatchIdentityIndex(identityIndex)) {
    await AddPurchaseBatch.collection.dropIndex(
      'uniq_purchase_batch_identity',
    );
    console.log('Dropped incompatible purchase batch identity index.');
  }

  await AddPurchaseBatch.collection.createIndex(
    { batchCode: 1 },
    { name: 'batchCode_1' },
  );
  await AddPurchaseBatch.collection.createIndex(
    { purchaseDate: 1, sellerName: 1, billNumber: 1 },
    { unique: true, name: 'uniq_purchase_batch_identity' },
  );

  if (legacyIndexes.length === 0) {
    console.log('No legacy unique purchase batch batchCode index found.');
  }

  console.log('Purchase batch indexes repaired.');
  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
