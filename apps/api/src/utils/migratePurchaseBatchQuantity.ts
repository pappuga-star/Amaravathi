import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { AddPurchaseBatch } from '../models/AddPurchaseBatch.js';

async function run() {
  await connectDatabase();

  const batches = await AddPurchaseBatch.find().lean();
  let updated = 0;

  for (const batch of batches) {
    const lineItems = (batch as any).lineItems ?? (batch as any).items ?? [];
    const normalizedLineItems = lineItems.map((item: any) => {
      const quantityKg = Number(item.quantityKg ?? 1);
      const pricePerKg = Number(item.pricePerKg ?? item.ratePerKg ?? 0);
      return {
        teaPowderTypeId: item.teaPowderTypeId,
        teaPowderTypeName: item.teaPowderTypeName ?? item.teaPowderType ?? '',
        quantityKg,
        pricePerKg,
        totalAmount: Number((quantityKg * pricePerKg).toFixed(2)),
        availableStockInGrams:
          Number(item.availableStockInGrams) > 0
            ? Number(item.availableStockInGrams)
            : Math.round(quantityKg * 1000),
      };
    });

    const totalQuantityKg = Number(
      normalizedLineItems
        .reduce((sum: number, item: any) => sum + Number(item.quantityKg || 0), 0)
        .toFixed(3),
    );
    const totalBatchAmount = Number(
      normalizedLineItems
        .reduce((sum: number, item: any) => sum + Number(item.totalAmount || 0), 0)
        .toFixed(2),
    );

    await AddPurchaseBatch.findByIdAndUpdate(batch._id, {
      $set: {
        lineItems: normalizedLineItems,
        totalQuantityKg,
        totalBatchAmount,
      },
      $unset: {
        items: 1,
      },
    });
    updated += 1;
  }

  console.log(`Purchase batch migration completed. Updated: ${updated}`);
  await mongoose.connection.close();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.connection.close();
  process.exit(1);
});
