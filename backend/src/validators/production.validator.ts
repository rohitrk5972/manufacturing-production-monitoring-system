import { z } from 'zod';

export const productionRecordBaseSchema = z.object({
  line_id: z.coerce.number().int().positive({ message: 'Line ID must be a positive integer' }),
  production_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Production date must be in YYYY-MM-DD format' }),
  shift_id: z.coerce.number().int().positive({ message: 'Shift ID must be a positive integer' }),
  product_id: z.coerce.number().int().positive({ message: 'Product ID must be a positive integer' }),
  units_produced: z.coerce.number().int().min(0, { message: 'Units produced cannot be negative' }),
  defect_units: z.coerce.number().int().min(0, { message: 'Defect units cannot be negative' }),
  energy_consumption_kwh: z.coerce.number().min(0, { message: 'Energy consumption cannot be negative' }),
  operator_name: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const createProductionRecordSchema = productionRecordBaseSchema.refine(
  (data) => data.defect_units <= data.units_produced,
  {
    message: 'Defect units cannot exceed total units produced',
    path: ['defect_units'],
  }
);

export const updateProductionRecordSchema = productionRecordBaseSchema.partial().refine(
  (data) => {
    if (data.units_produced !== undefined && data.defect_units !== undefined) {
      return data.defect_units <= data.units_produced;
    }
    return true;
  },
  {
    message: 'Defect units cannot exceed total units produced',
    path: ['defect_units'],
  }
);

export const productionFilterSchema = z.object({
  line_id: z.coerce.number().int().positive().optional(),
  shift_id: z.coerce.number().int().positive().optional(),
  product_id: z.coerce.number().int().positive().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['production_date', 'units_produced', 'defect_units', 'energy_consumption_kwh', 'created_at']).default('production_date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const analyticsFilterSchema = z.object({
  line_id: z.coerce.number().int().positive().optional(),
  shift_id: z.coerce.number().int().positive().optional(),
  product_id: z.coerce.number().int().positive().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
