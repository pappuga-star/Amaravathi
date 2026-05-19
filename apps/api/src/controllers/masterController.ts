import type { Request, Response } from 'express';
import { z } from 'zod';
import { LeafCategory } from '../models/index.js';
import {
  leafCategorySchema,
} from '@amaravathi/shared-types';
import {
  isSearchQueryPresent as isSearchQueryPresentUtil,
} from '@amaravathi/shared-utils';
import { ok, created } from '../utils/apiResponse.js';
import { buildContainsRegex } from '../search/search.utils.js';
import { runListSearch } from '../search/search.service.js';
import { invalidateSearchCaches, SEARCH_CACHE_PREFIXES } from '../search/search.events.js';

function buildMasterController(
  model: any,
  schema: z.ZodObject<any>,
  searchFields: string[],
  defaultSortField = 'name',
  populateFields: string[] = [],
) {
  return {
    async list(req: Request, res: Response) {
      const status = String(req.query.status ?? 'all')
        .trim()
        .toLowerCase();
      const statusFilter: any = {};
      if (status === 'deleted') {
        statusFilter.deletedAt = { $ne: null };
      } else {
        statusFilter.deletedAt = null;
        if (status === 'active') statusFilter.active = true;
        if (status === 'inactive') statusFilter.active = false;
      }

      const data = await runListSearch({
        namespace: model.modelName,
        model,
        query: req.query,
        defaultSortBy: defaultSortField,
        allowedSortBy: [defaultSortField, ...searchFields, 'createdAt'],
        searchFields: searchFields.map((field) => ({
          field,
          ...(field === 'name' ? { keyField: 'nameKey' } : {}),
          category: field.toLowerCase().includes('code') ? 'code' : 'name',
        })),
        baseFilter: statusFilter,
        buildFilter: (q) => {
          if (!isSearchQueryPresentUtil(q) || !searchFields.length) return {};
          const regex = buildContainsRegex(q);
          return {
            $or: searchFields.map((field) => ({ [field]: regex })),
          };
        },
        transformItem: (item: any) => item,
      });

      let items = data.items as any[];
      if (populateFields.length) {
        const ids = items.map((item: any) => item._id);
        let queryBuilder = model.find({ _id: { $in: ids } });
        for (const field of populateFields) {
          queryBuilder = queryBuilder.populate(field);
        }
        const populated = await queryBuilder.lean();
        const byId = new Map(populated.map((item: any) => [String(item._id), item]));
        items = ids.map((id: any) => byId.get(String(id))).filter(Boolean);
      }

      const normalizedItems = items.map((item: any) => ({
        ...item,
        id: item._id.toString(),
      }));

      return ok(res, {
        items: normalizedItems,
        pagination: data.pagination,
        total: data.total,
        page: data.page,
        limit: data.limit,
      });
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
      invalidateSearchCaches({
        prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
        reason: 'create',
      });
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
        const fieldName =
          model.modelName === 'LeafCategory'
            ? 'leafCategoryId'
            : 'cuttingTypeId';
        if (
          model.modelName === 'LeafCategory' ||
          model.modelName === 'CuttingType'
        ) {
          await mongoose
            .model('CustomerTeaFormula')
            .updateMany({ [fieldName]: req.params.id }, { status: 'Inactive' });
        }
      }
      invalidateSearchCaches({
        prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
        reason: 'update',
      });

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
      const fieldName =
        model.modelName === 'LeafCategory' ? 'leafCategoryId' : 'cuttingTypeId';
      if (
        model.modelName === 'LeafCategory' ||
        model.modelName === 'CuttingType'
      ) {
        await mongoose
          .model('CustomerTeaFormula')
          .updateMany({ [fieldName]: req.params.id }, { status: 'Inactive' });
      }
      invalidateSearchCaches({
        prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
        reason: 'delete',
      });

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
      invalidateSearchCaches({
        prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
        reason: 'restore',
      });
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
