import { Router } from 'express';
import { permit, requireAuth } from '../middleware/auth.js';
import { searchAdminController } from './search-admin.controller.js';

const router = Router();
const wrap =
  (fn: (req: any, res: any) => Promise<any> | any) =>
  (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res)).catch(next);
  };

router.use(requireAuth, permit('admin'));

router.get('/health', wrap(searchAdminController.health));
router.get('/metrics', searchAdminController.metrics);
router.post('/clear-cache', searchAdminController.clearCache);
router.post('/index-audit', wrap(searchAdminController.indexAudit));
router.post('/run-benchmark', wrap(searchAdminController.runBenchmark));
router.get('/alerts', wrap(searchAdminController.alerts));

export const searchAdminRoutes = router;
