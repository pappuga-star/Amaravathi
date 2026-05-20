import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import mongoose from 'mongoose';
import {
  teaPowderTypeSchema,
  sellerSchema,
  customerSchema,
  userSchema,
} from '@amaravathi/shared-types';
import { escapeRegex } from '@amaravathi/shared-utils';
import {
  createUser,
  login,
  me,
  updateUser,
  deleteUser,
} from '../controllers/authController.js';
import { globalSearchRoutes } from './globalSearchRoutes.js';
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
import {
  createGeneralItem,
  createGeneralItemsMaster,
  deleteGeneralItem,
  deleteGeneralItemsMaster,
  generalItemsRateHistory,
  generalItemsStockSummary,
  getGeneralItem,
  listGeneralItems,
  listGeneralItemsMaster,
  updateGeneralItem,
  updateGeneralItemsMaster,
} from '../controllers/generalItemsController.js';
import { requireAuth, permit } from '../middleware/auth.js';
import { validateObjectIdParam } from '../middleware/validateObjectId.js';
import {
  TeaPowderType,
  AddPurchaseBatch,
  User,
  Seller,
  Customer,
  CustomerTeaFormula,
} from '../models/index.js';
import { leafCategoriesController } from '../controllers/masterController.js';
import { customerTeaFormulasController } from '../controllers/customerTeaFormulaController.js';
import { invalidateSearchCaches, SEARCH_CACHE_PREFIXES } from '../search/search.events.js';
import { searchRateLimit } from '../search/search-rate-limit.js';
import { searchAdminRoutes } from '../search/search-admin.routes.js';
import {
  getSystemSettingsController,
  updateSystemSettingsController,
} from '../controllers/systemSettingsController.js';
import { throwLinkedRecordsError } from '../utils/errors.js';

const router = Router();
router.param('id', validateObjectIdParam('id'));
router.param('customerId', validateObjectIdParam('customerId'));
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
  const dbStatus =
    dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
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
router.get('/system-settings', asyncHandler(getSystemSettingsController));
router.use('/global-search', globalSearchRoutes);
router.use('/search-admin', searchAdminRoutes);
router.post('/users', permit('admin'), asyncHandler(createUser));
router.put('/system-settings', asyncHandler(updateSystemSettingsController));

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

router.get('/tea-powder-types', searchRateLimit('search:list'), asyncHandler(teaPowderTypes.list));
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

    // 2. Check if used in Purchase Batch line items
    const batchUse = await AddPurchaseBatch.findOne({
      'lineItems.teaPowderTypeName': new RegExp(
        `^${escapeRegex(item.name)}$`,
        'i',
      ),
    });
    if (batchUse) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete because this Tea Powder Type is already in use in Purchase Batch #${batchUse.serialNumber} (Batch Code: ${batchUse.batchCode}).`,
      });
    }

    await TeaPowderType.findByIdAndDelete(id);
    invalidateSearchCaches({
      prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
      reason: 'delete',
    });
    return res.json({ success: true, message: 'Deleted', data: { id } });
  }),
);

router.get('/add-purchase-batch', searchRateLimit('search:list'), asyncHandler(listAddPurchaseBatches));
router.post(
  '/add-purchase-batch',
  permit('admin', 'pricing_manager'),
  asyncHandler(createAddPurchaseBatch),
);
router.get(
  '/add-purchase-batch/search',
  searchRateLimit('search:autocomplete'),
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

router.get('/general-items', searchRateLimit('search:list'), asyncHandler(listGeneralItems));
router.post(
  '/general-items',
  permit('admin', 'pricing_manager'),
  asyncHandler(createGeneralItem),
);
router.get(
  '/general-items/rate-history',
  searchRateLimit('search:autocomplete'),
  asyncHandler(generalItemsRateHistory),
);
router.get(
  '/general-items/stock-summary',
  asyncHandler(generalItemsStockSummary),
);
router.get('/general-items/:id', asyncHandler(getGeneralItem));
router.put(
  '/general-items/:id',
  permit('admin', 'pricing_manager'),
  asyncHandler(updateGeneralItem),
);
router.delete(
  '/general-items/:id',
  permit('admin'),
  asyncHandler(deleteGeneralItem),
);

router.get('/general-items-master', searchRateLimit('search:dropdown'), asyncHandler(listGeneralItemsMaster));
router.post(
  '/general-items-master',
  permit('admin', 'pricing_manager'),
  asyncHandler(createGeneralItemsMaster),
);
router.put(
  '/general-items-master/:id',
  permit('admin', 'pricing_manager'),
  asyncHandler(updateGeneralItemsMaster),
);
router.delete(
  '/general-items-master/:id',
  permit('admin'),
  asyncHandler(deleteGeneralItemsMaster),
);

router.get('/users', permit('admin'), asyncHandler(users.list));
router.put('/users/:id', permit('admin'), asyncHandler(updateUser));
router.delete('/users/:id', permit('admin'), asyncHandler(deleteUser));

router.get('/sellers', searchRateLimit('search:list'), asyncHandler(sellers.list));
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
      sellerName: new RegExp(`^${escapeRegex(seller.name)}$`, 'i'),
    });
    if (batchUse) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete because this Seller is already in use in Purchase Batch #${batchUse.serialNumber} (Batch Code: ${batchUse.batchCode}).`,
      });
    }
    await Seller.findByIdAndDelete(id);
    invalidateSearchCaches({
      prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
      reason: 'delete',
    });
    return res.json({ success: true, message: 'Deleted', data: { id } });
  }),
);

router.get('/customers', searchRateLimit('search:list'), asyncHandler(customers.list));
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
    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID',
      });
    }
    const customerObjectId = new mongoose.Types.ObjectId(id);

    const customer = await Customer.findById(customerObjectId).lean();
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const dependencyCount = await CustomerTeaFormula.countDocuments({
      customerId: customerObjectId,
      deletedAt: null,
    });
    if (dependencyCount > 0) {
      throwLinkedRecordsError({
        entity: 'customer',
        message: 'Cannot delete customer because related custom tea formulas exist.',
        recordId: id,
        recordName: customer.name,
        dependencyType: 'customerTeaFormulas',
        dependencyCount,
        actionLabel: 'View Formulas',
        redirectUrl: `/taste-customization?tab=saved-formulas&q=${encodeURIComponent(customer.name)}`,
      });
    }

    await Customer.findByIdAndDelete(id);
    invalidateSearchCaches({
      prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
      reason: 'delete',
    });
    return res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  }),
);

router.get('/reports/latest-purchase-rates', asyncHandler(latestPurchaseRates));
router.get(
  '/reports/latest-rates-by-tea-powder',
  asyncHandler(latestRatesByTeaPowder),
);
router.get(
  '/reports/seller-purchase-history',
  searchRateLimit('search:reports'),
  asyncHandler(sellerPurchaseHistory),
);

// Leaf Categories API
router.get('/leaf-categories', searchRateLimit('search:list'), asyncHandler(leafCategoriesController.list));
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

// Customer Tea Formulas routes
router.get(
  '/customers/:customerId/tea-formulas',
  searchRateLimit('search:list'),
  asyncHandler(customerTeaFormulasController.list),
);

router.get(
  '/customer-tea-formulas',
  searchRateLimit('search:list'),
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
  searchRateLimit('search:list'),
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
