import { Router, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { globalSearchController } from '../controllers/globalSearchController.js';
import { requireAuth } from '../middleware/auth.js';

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
router.get('/', asyncHandler(globalSearchController.search));

export const globalSearchRoutes = router;
