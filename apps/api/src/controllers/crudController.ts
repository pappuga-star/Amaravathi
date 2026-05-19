import type { Request, Response } from 'express';
import type { Model } from 'mongoose';
import type { ZodObject, ZodRawShape } from 'zod';
import { created, ok } from '../utils/apiResponse.js';
import { buildContainsRegex } from '../search/search.utils.js';
import { runListSearch } from '../search/search.service.js';
import { invalidateSearchCaches, SEARCH_CACHE_PREFIXES } from '../search/search.events.js';

export function crudController(
  model: Model<any>,
  schema: ZodObject<ZodRawShape>,
  searchFields: string[] = [],
) {
  return {
    async list(req: Request, res: Response) {
      const data = await runListSearch({
        namespace: model.modelName,
        model,
        query: req.query,
        defaultSortBy: 'createdAt',
        allowedSortBy: ['createdAt', ...searchFields],
        searchFields: searchFields.map((field) => ({
          field,
          ...(field === 'name' ? { keyField: 'nameKey' } : {}),
          category: field.toLowerCase().includes('code') ? 'code' : 'name',
        })),
        useEstimatedCountWhenNoFilter: true,
        buildFilter: (q) => {
          if (!q || !searchFields.length) return {};
          const regex = buildContainsRegex(q);
          return {
            $or: searchFields.map((field) => ({
              [field]: regex,
            })),
          };
        },
      });

      const normalizedItems = data.items.map((item: any) => ({
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
      const item = await model.findById(req.params.id).lean();
      if (!item)
        throw Object.assign(new Error('Record not found'), { status: 404 });
      return ok(res, { ...item, id: (item as any)._id.toString() });
    },

    async create(req: Request, res: Response) {
      const body = schema.parse(req.body);
      const item = await model.create(body);
      const itemObj = item.toObject ? item.toObject() : item;
      invalidateSearchCaches({
        prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
        reason: 'create',
      });
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
      invalidateSearchCaches({
        prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
        reason: 'update',
      });
      return ok(
        res,
        { ...itemObj, id: (item as any)._id.toString() },
        'Updated',
      );
    },

    async remove(req: Request, res: Response) {
      const item = await model.findByIdAndDelete(req.params.id);
      if (!item)
        throw Object.assign(new Error('Record not found'), { status: 404 });
      invalidateSearchCaches({
        prefixes: [SEARCH_CACHE_PREFIXES.list, SEARCH_CACHE_PREFIXES.global],
        reason: 'delete',
      });
      return ok(res, { id: req.params.id }, 'Deleted');
    },
  };
}
