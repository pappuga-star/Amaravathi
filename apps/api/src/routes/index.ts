import { Router } from 'express';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import mongoose from 'mongoose';
import {
  teaPowderTypeSchema,
  sellerSchema,
  customerSchema,
  userSchema,
} from '@amaravathi/shared-types';
import { createUser, login, me, updateUser, deleteUser } from '../controllers/authController.js';
import { globalSearch } from '../controllers/searchController.js';
import { crudController } from '../controllers/crudController.js';
import {
  createAddPurchaseBatch,
  deleteAddPurchaseBatch,
  getAddPurchaseBatch,
  latestRatesByTeaPowder,
  listAddPurchaseBatches,
  lookupAddPurchaseBatch,
  searchAddPurchaseBatches,
  updateAddPurchaseBatch,
} from '../controllers/addPurchaseBatchController.js';
import {
  latestPurchaseRates,
  sellerPurchaseHistory,
} from '../controllers/reportController.js';
import { requireAuth, permit } from '../middleware/auth.js';
import {
  TeaPowderType,
  AddPurchaseBatch,
  User,
  Seller,
  Customer,
} from '../models/index.js';
import {
  leafCategoriesController,
  cuttingTypesController,
} from '../controllers/masterController.js';
import { customerTeaFormulasController } from '../controllers/customerTeaFormulaController.js';

const router = Router();
const asyncHandler =
  (
    handler: (
      req: Request,
      res: Response,
      next: NextFunction,
    ) => Promise<unknown>,
  ): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };

router.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  const dbName = mongoose.connection.db?.databaseName ?? 'unknown';
  res.json({
    success: true,
    data: {
      status: 'ok',
      database: dbStatus,
      databaseName: dbName,
      timestamp: new Date().toISOString(),
    },
  });
});
router.post('/auth/login', asyncHandler(login));

router.use(requireAuth);
router.get('/auth/me', asyncHandler(me));
router.get('/search', asyncHandler(globalSearch));
router.post('/users', permit('admin'), asyncHandler(createUser));

const teaPowderTypes = crudController(TeaPowderType, teaPowderTypeSchema, [
  'name',
]);
const users = crudController(User, userSchema, ['name', 'email']);
const sellers = crudController(Seller, sellerSchema, [
  'name',
  'contactPerson',
  'phone',
  'email',
]);
const customers = crudController(Customer, customerSchema, [
  'name',
  'mobileNumber',
]);

router.get('/tea-powder-types', asyncHandler(teaPowderTypes.list));
router.post(
  '/tea-powder-types',
  permit('admin', 'pricing_manager'),
  asyncHandler(teaPowderTypes.create),
);
router.get('/tea-powder-types/:id', asyncHandler(teaPowderTypes.get));
router.put(
  '/tea-powder-types/:id',
  permit('admin', 'pricing_manager'),
  asyncHandler(teaPowderTypes.update),
);

// Custom Delete Handler with use validation checks (Grades, Batches)
router.delete(
  '/tea-powder-types/:id',
  permit('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const item = await TeaPowderType.findById(id);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: 'Record not found' });
    }

    // 2. Check if used in Purchase Batch line items (items.teaPowderType matching name)
    const batchUse = await AddPurchaseBatch.findOne({
      'items.teaPowderType': { $regex: `^${item.name}$`, $options: 'i' },
    });
    if (batchUse) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete because this Tea Powder Type is already in use in Purchase Batch #${batchUse.serialNumber} (Batch Code: ${batchUse.batchCode}).`,
      });
    }

    await TeaPowderType.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Deleted', data: { id } });
  }),
);




router.get('/add-purchase-batch', asyncHandler(listAddPurchaseBatches));
router.post(
  '/add-purchase-batch',
  permit('admin', 'pricing_manager'),
  asyncHandler(createAddPurchaseBatch),
);
router.get(
  '/add-purchase-batch/search',
  asyncHandler(searchAddPurchaseBatches),
);
router.get('/add-purchase-batch/lookup', asyncHandler(lookupAddPurchaseBatch));
router.get('/add-purchase-batch/:id', asyncHandler(getAddPurchaseBatch));
router.put(
  '/add-purchase-batch/:id',
  permit('admin', 'pricing_manager'),
  asyncHandler(updateAddPurchaseBatch),
);
router.delete(
  '/add-purchase-batch/:id',
  permit('admin'),
  asyncHandler(deleteAddPurchaseBatch),
);

router.get('/users', permit('admin'), asyncHandler(users.list));
router.put('/users/:id', permit('admin'), asyncHandler(updateUser));
router.delete('/users/:id', permit('admin'), asyncHandler(deleteUser));

router.get('/sellers', asyncHandler(sellers.list));
router.post(
  '/sellers',
  permit('admin', 'pricing_manager'),
  asyncHandler(sellers.create),
);
router.get('/sellers/:id', asyncHandler(sellers.get));
router.put(
  '/sellers/:id',
  permit('admin', 'pricing_manager'),
  asyncHandler(sellers.update),
);
router.delete(
  '/sellers/:id',
  permit('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const seller = await Seller.findById(id);
    if (!seller) {
      return res
        .status(404)
        .json({ success: false, message: 'Record not found' });
    }
    // Check if this seller is used inside any AddPurchaseBatch records
    const batchUse = await AddPurchaseBatch.findOne({
      sellerName: { $regex: `^${seller.name}$`, $options: 'i' },
    });
    if (batchUse) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete because this Seller is already in use in Purchase Batch #${batchUse.serialNumber} (Batch Code: ${batchUse.batchCode}).`,
      });
    }
    await Seller.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Deleted', data: { id } });
  }),
);

router.get('/customers', asyncHandler(customers.list));
router.post(
  '/customers',
  permit('admin', 'pricing_manager'),
  asyncHandler(customers.create),
);
router.get('/customers/:id', asyncHandler(customers.get));
router.put(
  '/customers/:id',
  permit('admin', 'pricing_manager'),
  asyncHandler(customers.update),
);
router.delete(
  '/customers/:id',
  permit('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    // Check if this customer is used inside any formulas
    const mongoose = (await import('mongoose')).default;
    const formulaUse = await mongoose.model('CustomerTeaFormula').findOne({ customerId: id });
    if (formulaUse) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete because this Customer is linked to active tea formulas.`,
      });
    }
    await Customer.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Deleted', data: { id } });
  }),
);

router.get('/reports/latest-purchase-rates', asyncHandler(latestPurchaseRates));
router.get(
  '/reports/latest-rates-by-tea-powder',
  asyncHandler(latestRatesByTeaPowder),
);
router.get(
  '/reports/seller-purchase-history',
  asyncHandler(sellerPurchaseHistory),
);

// Leaf Categories API
router.get('/leaf-categories', asyncHandler(leafCategoriesController.list));
router.post(
  '/leaf-categories',
  permit('admin', 'pricing_manager'),
  asyncHandler(leafCategoriesController.create),
);
router.get('/leaf-categories/:id', asyncHandler(leafCategoriesController.get));
router.put(
  '/leaf-categories/:id',
  permit('admin', 'pricing_manager'),
  asyncHandler(leafCategoriesController.update),
);
router.delete(
  '/leaf-categories/:id',
  permit('admin'),
  asyncHandler(leafCategoriesController.remove),
);
router.post(
  '/leaf-categories/:id/restore',
  permit('admin'),
  asyncHandler(leafCategoriesController.restore),
);

// Cutting Types API
router.get('/cutting-types', asyncHandler(cuttingTypesController.list));
router.post(
  '/cutting-types',
  permit('admin', 'pricing_manager'),
  asyncHandler(cuttingTypesController.create),
);
router.get('/cutting-types/:id', asyncHandler(cuttingTypesController.get));
router.put(
  '/cutting-types/:id',
  permit('admin', 'pricing_manager'),
  asyncHandler(cuttingTypesController.update),
);
router.delete(
  '/cutting-types/:id',
  permit('admin'),
  asyncHandler(cuttingTypesController.remove),
);
router.post(
  '/cutting-types/:id/restore',
  permit('admin'),
  asyncHandler(cuttingTypesController.restore),
);


// Customer Tea Formulas routes
router.get(
  '/customers/:customerId/tea-formulas',
  asyncHandler(customerTeaFormulasController.list),
);

router.get(
  '/customer-tea-formulas',
  asyncHandler(customerTeaFormulasController.list),
);
router.post(
  '/customer-tea-formulas',
  permit('admin', 'pricing_manager'),
  asyncHandler(customerTeaFormulasController.create),
);
router.get(
  '/customer-tea-formulas/:id',
  asyncHandler(customerTeaFormulasController.get),
);
router.put(
  '/customer-tea-formulas/:id',
  permit('admin', 'pricing_manager'),
  asyncHandler(customerTeaFormulasController.update),
);
router.delete(
  '/customer-tea-formulas/:id',
  permit('admin'),
  asyncHandler(customerTeaFormulasController.remove),
);
router.post(
  '/customer-tea-formulas/:id/duplicate',
  permit('admin', 'pricing_manager'),
  asyncHandler(customerTeaFormulasController.duplicate),
);
router.post(
  '/customer-tea-formulas/:id/set-default',
  permit('admin', 'pricing_manager'),
  asyncHandler(customerTeaFormulasController.setDefault),
);

// Taste Customizations Route Aliases for Backward Compatibility
router.get(
  '/taste-customizations',
  asyncHandler(customerTeaFormulasController.list),
);
router.post(
  '/taste-customizations',
  permit('admin', 'pricing_manager'),
  asyncHandler(customerTeaFormulasController.create),
);
router.get(
  '/taste-customizations/:id',
  asyncHandler(customerTeaFormulasController.get),
);
router.put(
  '/taste-customizations/:id',
  permit('admin', 'pricing_manager'),
  asyncHandler(customerTeaFormulasController.update),
);
router.delete(
  '/taste-customizations/:id',
  permit('admin'),
  asyncHandler(customerTeaFormulasController.remove),
);
router.post(
  '/taste-customizations/:id/duplicate',
  permit('admin', 'pricing_manager'),
  asyncHandler(customerTeaFormulasController.duplicate),
);
router.post(
  '/taste-customizations/:id/set-default',
  permit('admin', 'pricing_manager'),
  asyncHandler(customerTeaFormulasController.setDefault),
);

export default router;
