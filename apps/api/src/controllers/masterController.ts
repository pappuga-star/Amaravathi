import type { Request, Response } from 'express';
import { z } from 'zod';
import { LeafCategory, CuttingType } from '../models/index.js';
import {
  leafCategorySchema,
  cuttingTypeSchema,
} from '@amaravathi/shared-types';
import { ok, created } from '../utils/apiResponse.js';

function buildMasterController(
  model: any,
  schema: z.ZodObject<any>,
  searchFields: string[],
  defaultSortField = 'name',
  populateFields: string[] = [],
) {
  return {
    async list(req: Request, res: Response) {
      const q = String(req.query.q ?? '').trim();
      const status = String(req.query.status ?? 'all')
        .trim()
        .toLowerCase();
      const sortBy = String(req.query.sortBy ?? defaultSortField).trim();
      const sortOrder =
        String(req.query.sortOrder ?? 'asc')
          .trim()
          .toLowerCase() === 'desc'
          ? -1
          : 1;

      const page = Math.max(Number(req.query.page ?? 1), 1);
      const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);

      const filter: any = {};

      // 1. Search Query
      if (q && searchFields.length) {
        filter.$or = searchFields.map((field) => ({
          [field]: { $regex: q, $options: 'i' },
        }));
      }

      // 2. Status Filtering
      if (status === 'deleted') {
        filter.deletedAt = { $ne: null };
      } else {
        filter.deletedAt = null;
        if (status === 'active') {
          filter.active = true;
        } else if (status === 'inactive') {
          filter.active = false;
        }
      }

      const sortConfig: any = { [sortBy]: sortOrder };

      let queryBuilder = model.find(filter);
      for (const field of populateFields) {
        queryBuilder = queryBuilder.populate(field);
      }

      const [items, total] = await Promise.all([
        queryBuilder
          .sort(sortConfig)
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
      let queryBuilder = model.findById(req.params.id);
      for (const field of populateFields) {
        queryBuilder = queryBuilder.populate(field);
      }
      const item = await queryBuilder.lean();
      if (!item) {
        return res
          .status(404)
          .json({ success: false, message: 'Record not found' });
      }
      return ok(res, { ...item, id: item._id.toString() });
    },

    async create(req: Request, res: Response) {
      const body = schema.parse(req.body);
      const item = await model.create(body);
      return created(res, { ...item.toObject(), id: item._id.toString() });
    },

    async update(req: Request, res: Response) {
      const body = schema.partial().parse(req.body);
      const item = await model.findByIdAndUpdate(req.params.id, body, {
        new: true,
        runValidators: true,
      });
      if (!item) {
        return res
          .status(404)
          .json({ success: false, message: 'Record not found' });
      }

      // Cascade inactive status to dependent formulas
      if (body.active === false) {
        const mongoose = (await import('mongoose')).default;
        const fieldName = model.modelName === 'LeafCategory' ? 'leafCategoryId' : 'cuttingTypeId';
        if (model.modelName === 'LeafCategory' || model.modelName === 'CuttingType') {
          await mongoose.model('CustomerTeaFormula').updateMany(
            { [fieldName]: req.params.id },
            { status: 'Inactive' }
          );
        }
      }

      return ok(
        res,
        { ...item.toObject(), id: item._id.toString() },
        'Updated',
      );
    },

    async remove(req: Request, res: Response) {
      const item = await model.findByIdAndUpdate(
        req.params.id,
        { deletedAt: new Date(), active: false },
        { new: true },
      );
      if (!item) {
        return res
          .status(404)
          .json({ success: false, message: 'Record not found' });
      }

      // Cascade inactive status to dependent formulas upon soft delete
      const mongoose = (await import('mongoose')).default;
      const fieldName = model.modelName === 'LeafCategory' ? 'leafCategoryId' : 'cuttingTypeId';
      if (model.modelName === 'LeafCategory' || model.modelName === 'CuttingType') {
        await mongoose.model('CustomerTeaFormula').updateMany(
          { [fieldName]: req.params.id },
          { status: 'Inactive' }
        );
      }

      return ok(res, { id: req.params.id }, 'Soft Deleted');
    },

    async restore(req: Request, res: Response) {
      const item = await model.findByIdAndUpdate(
        req.params.id,
        { deletedAt: null, active: true },
        { new: true },
      );
      if (!item) {
        return res
          .status(404)
          .json({ success: false, message: 'Record not found' });
      }
      return ok(
        res,
        { ...item.toObject(), id: item._id.toString() },
        'Restored',
      );
    },
  };
}

export const leafCategoriesController = buildMasterController(
  LeafCategory,
  leafCategorySchema,
  ['name', 'description'],
  'name',
);

export const cuttingTypesController = buildMasterController(
  CuttingType,
  cuttingTypeSchema,
  ['name', 'description'],
  'name',
  ['leafCategoryId'],
);

