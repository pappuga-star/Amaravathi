import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/db.js';
import {
  AddPurchaseBatch,
  TeaPowderType,
  User,
  Seller,
  Customer,
  LeafCategory,
  CuttingType,
  CustomerTeaFormula,
} from '../models/index.js';
import { normalizeName } from '@amaravathi/shared-utils';

export async function seedDatabase(exitOnComplete = false) {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Users
  await User.updateOne(
    { email: 'admin@amaravathi.local' },
    {
      $setOnInsert: {
        name: 'System Admin',
        email: 'admin@amaravathi.local',
        passwordHash: await bcrypt.hash('Admin@12345', 12),
        role: 'admin',
        active: true,
      },
    },
    { upsert: true },
  );

  await User.updateOne(
    { email: 'operator@amaravathi.local' },
    {
      $setOnInsert: {
        name: 'Pricing Operator',
        email: 'operator@amaravathi.local',
        passwordHash: await bcrypt.hash('Operator@12345', 12),
        role: 'operator',
        active: true,
      },
    },
    { upsert: true },
  );

  await User.updateOne(
    { email: 'viewer@amaravathi.local' },
    {
      $setOnInsert: {
        name: 'Read-only Viewer',
        email: 'viewer@amaravathi.local',
        passwordHash: await bcrypt.hash('Viewer@12345', 12),
        role: 'viewer',
        active: true,
      },
    },
    { upsert: true },
  );

  console.log('✅ Seeded users (Admin, Operator, Viewer)');

  // 2. Seed Sellers
  await Seller.findOneAndUpdate(
    { name: 'ABC Tea Traders' },
    {
      $set: {
        name: 'ABC Tea Traders',
        nameKey: normalizeName('ABC Tea Traders'),
        contactPerson: 'Aditya Sen',
        phone: '+91 9988776655',
        email: 'aditya@abctea.com',
        active: true,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  console.log('✅ Seeded seller: ABC Tea Traders');

  // 3. Seed Tea Powder Types
  const powderTypeNames = [
    'Dust',
    'Leaf',
    'Lumsa',
    'Color',
    'Tea Powder',
    'Addon',
  ];
  for (const name of powderTypeNames) {
    await TeaPowderType.findOneAndUpdate(
      { name },
      {
        $set: {
          name,
          nameKey: normalizeName(name),
          description: `${name} tea powder type`,
          active: true,
        },
      },
      { upsert: true, new: true, runValidators: true },
    );
  }
  console.log('✅ Seeded tea powder types');

  // 4. Seed Leaf Categories
  const assamGold = await LeafCategory.findOneAndUpdate(
    { name: 'Assam Gold' },
    {
      $set: {
        name: 'Assam Gold',
        nameKey: normalizeName('Assam Gold'),
        description: 'Premium Assam leaf tea with rich aroma',
        active: true,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  const darjeelingClassic = await LeafCategory.findOneAndUpdate(
    { name: 'Darjeeling Classic' },
    {
      $set: {
        name: 'Darjeeling Classic',
        nameKey: normalizeName('Darjeeling Classic'),
        description: 'Fragrant and delicate Darjeeling black tea',
        active: true,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  console.log('✅ Seeded leaf categories: Assam Gold, Darjeeling Classic');

  // 5. Seed Cutting Types
  const bopCutting = await CuttingType.findOneAndUpdate(
    { name: 'BOP', leafCategoryId: assamGold?._id },
    {
      $set: {
        name: 'BOP',
        nameKey: normalizeName('BOP'),
        basePrice: 180,
        leafCategoryId: assamGold?._id,
        description: 'Broken Orange Pekoe',
        active: true,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  await CuttingType.findOneAndUpdate(
    { name: 'BP', leafCategoryId: assamGold?._id },
    {
      $set: {
        name: 'BP',
        nameKey: normalizeName('BP'),
        basePrice: 200,
        leafCategoryId: assamGold?._id,
        description: 'Broken Pekoe',
        active: true,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  await CuttingType.findOneAndUpdate(
    { name: 'OF', leafCategoryId: darjeelingClassic?._id },
    {
      $set: {
        name: 'OF',
        nameKey: normalizeName('OF'),
        basePrice: 220,
        leafCategoryId: darjeelingClassic?._id,
        description: 'Orange Fannings',
        active: true,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  console.log('✅ Seeded cutting types: BOP, BP, OF');

  // 6. Seed Customers
  const ramaCustomer = await Customer.findOneAndUpdate(
    { name: 'Sri Rama Tea Stall' },
    {
      $set: {
        name: 'Sri Rama Tea Stall',
        address: 'Near Main Market, Vijayawada',
        mobileNumber: '+91 9123456789',
        active: true,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  await Customer.findOneAndUpdate(
    { name: 'Krishna Cafe' },
    {
      $set: {
        name: 'Krishna Cafe',
        address: 'R.K. Beach Road, Visakhapatnam',
        mobileNumber: '+91 9876543210',
        active: true,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  console.log('✅ Seeded customers: Sri Rama Tea Stall, Krishna Cafe');

  // 7. Seed Customer Tea Formulas
  if (ramaCustomer && assamGold && bopCutting) {
    const formulasCount = await CustomerTeaFormula.countDocuments({
      customerId: ramaCustomer._id,
    });
    if (formulasCount === 0) {
      await CustomerTeaFormula.create({
        customerId: ramaCustomer._id,
        leafCategoryId: assamGold._id,
        cuttingTypeId: bopCutting._id,
        totalWeight: 160,
        totalFormulaCost: 201.5,
        costPerKg: 1259.37,
        costPer100Grams: 125.93,
        lineItems: [],
        addons: [
          { name: 'Color', price: 5, gramsPerKg: 10 },
          { name: 'Dust', price: 10, gramsPerKg: 50 },
          { name: 'Lumsa', price: 15, gramsPerKg: 100 },
        ],
        finalPrice: 201.5,
        marginPercent: 12,
        isDefault: true,
        notes: 'Signature daily mix blend for high-volume cafe supply',
        status: 'Active',
      });
      console.log('✅ Seeded customer tea formula: Kalyan Special Mix');
    }
  }

  // 8. Seed Purchase Batches
  await AddPurchaseBatch.findOneAndUpdate(
    { batchCode: '30/12/25' },
    {
      $set: {
        serialNumber: 1,
        purchaseDate: new Date('2025-12-15T00:00:00.000Z'),
        sellerName: 'ABC Tea Traders',
        billNumber: 'INV-001',
        numberOfBags: 30,
        items: [
          { subSerialNumber: 1, teaPowderType: 'Dust', ratePerKg: 120 },
          { subSerialNumber: 2, teaPowderType: 'Leaf', ratePerKg: 150 },
          { subSerialNumber: 3, teaPowderType: 'Lumsa', ratePerKg: 180 },
          { subSerialNumber: 4, teaPowderType: 'Color', ratePerKg: 210 },
          { subSerialNumber: 5, teaPowderType: 'Tea Powder', ratePerKg: 250 },
        ],
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  console.log('✅ Seeded purchase batch: 30/12/25');

  console.log('🎉 Database seeding complete!');
  if (exitOnComplete) {
    process.exit(0);
  }
}

// Check if this module is being run directly
const isDirectRun =
  process.argv[1]?.endsWith('seed.js') ||
  process.argv[1]?.endsWith('seed.ts') ||
  process.argv[1]?.includes('dist/utils/seed.js');

if (isDirectRun) {
  await connectDatabase();
  await seedDatabase(true);
}
