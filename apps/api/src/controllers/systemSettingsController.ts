import type { Request, Response } from 'express';
import { systemSettingsSchema } from '../system-settings.constants.js';
import { ok } from '../utils/apiResponse.js';
import {
  getSystemSettings,
  updateSystemSettings,
} from '../services/systemSettingsService.js';

export async function getSystemSettingsController(_req: Request, res: Response) {
  const settings = await getSystemSettings();
  return ok(res, settings);
}

export async function updateSystemSettingsController(
  req: Request,
  res: Response,
) {
  const role = String(req.user?.role ?? '').toLowerCase();
  if (!['admin', 'super_admin'].includes(role)) {
    return res.status(403).json({
      success: false,
      message: 'Permission denied',
    });
  }

  const parsed = systemSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.reduce(
      (acc, issue) => {
        const key = issue.path.length ? issue.path.join('.') : 'root';
        if (!acc[key]) {
          acc[key] = issue.message;
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  const settings = await updateSystemSettings(parsed.data, req.user?.id ?? null);
  return ok(res, settings, 'Updated');
}
