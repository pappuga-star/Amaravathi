import type { Request, Response } from 'express';
import type { Model } from 'mongoose';
import type { ZodObject, ZodRawShape } from 'zod';
import { created, ok } from '../utils/apiResponse.js';

export function crudController(
  model: Model<any>,
  schema: ZodObject<ZodRawShape>,
  searchFields: string[] = [],
) {
  return {
    async list(req: Request, res: Response) {
      const q = String(req.query.q ?? '').trim();
      const page = Math.max(Number(req.query.page ?? 1), 1);
      const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
      const filter =
        q && searchFields.length
          ? {
              $or: searchFields.map((field) => ({
                [field]: { $regex: q, $options: 'i' },
              })),
            }
          : {};
      const [items, total] = await Promise.all([
        model
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        model.countDocuments(filter),
      ]);
      const normalizedItems = items.map((item: any) => ({
        ...item,
        id: item._id.toString(),
      }));
      return ok(res, { items: normalizedItems, total, page, limit });
    },

    async get(req: Request, res: Response) {
      const item = await model.findById(req.params.id).lean();
      if (!item)
        throw Object.assign(new Error('Record not found'), { status: 404 });
      return ok(res, { ...item, id: (item as any)._id.toString() });
    },

    async create(req: Request, res: Response) {
      const body = schema.parse(req.body);
      const item = await model.create(body);
      const itemObj = item.toObject ? item.toObject() : item;
      return created(res, { ...itemObj, id: (item as any)._id.toString() });
    },

    async update(req: Request, res: Response) {
      const body = schema.partial().parse(req.body);
      const item = await model.findByIdAndUpdate(req.params.id, body, {
        new: true,
        runValidators: true,
      });
      if (!item)
        throw Object.assign(new Error('Record not found'), { status: 404 });
      const itemObj = item.toObject ? item.toObject() : item;
      return ok(res, { ...itemObj, id: (item as any)._id.toString() }, 'Updated');
    },

    async remove(req: Request, res: Response) {
      const item = await model.findByIdAndDelete(req.params.id);
      if (!item)
        throw Object.assign(new Error('Record not found'), { status: 404 });
      return ok(res, { id: req.params.id }, 'Deleted');
    },
  };
}
