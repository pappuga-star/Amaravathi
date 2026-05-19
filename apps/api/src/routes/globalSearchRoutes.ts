import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { globalSearchController } from '../controllers/globalSearchController.js';
import { requireAuth } from '../middleware/auth.js';
import { globalSearchRateLimit } from '../search/search-rate-limit.js';

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

router.use(requireAuth);
router.get('/', globalSearchRateLimit(), asyncHandler(globalSearchController.search));
router.get('/suggestions', globalSearchRateLimit(), asyncHandler(globalSearchController.suggestions));
router.get('/analytics', globalSearchRateLimit(), asyncHandler(async (req, res) => globalSearchController.analytics(req, res)));

export const globalSearchRoutes = router;
