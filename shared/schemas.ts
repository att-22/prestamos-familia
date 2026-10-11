/**
 * Shared Zod schemas for frontend and backend validation.
 * Copy this file to both projects or publish as npm package.
 */
import { z } from 'zod';

export const purchaseSchema = z.object({
  name: z.string().min(1).max(200),
  price_cash: z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v => parseFloat(v) > 0),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.number().int().min(1990).max(2030).optional(),
  is_used: z.boolean().default(false),
  notes: z.string().optional(),
});

export const financingOfferSchema = z.object({
  purchase_id: z.string().uuid(),
  source_name: z.string().min(1).max(200),
  down_payment: z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v => parseFloat(v) >= 0),
  tin: z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v => { const n = parseFloat(v); return n >= 0 && n <= 100; }),
  tae: z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v => { const n = parseFloat(v); return n >= 0 && n <= 100; }),
  months: z.number().int().min(1).max(120),
  monthly_payment: z.string().regex(/^\d+(\.\d{1,2})?$/).refine(v => parseFloat(v) >= 0),
  opening_fee: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default('0'),
  opening_fee_percent: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default('0'),
  early_repayment_fee_percent: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default('0'),
  mandatory_insurance_year: z.string().regex(/^\d+(\.\d{1,2})?$/).optional().default('0'),
  residual_value: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  residual_value_percent: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  notes: z.string().optional(),
});

export const comparisonSchema = z.object({
  purchase_id: z.string().uuid(),
  financing_offer_id: z.string().uuid(),
  user_monthly_income: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  user_available_savings: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});

export type PurchaseFormData = z.infer<typeof purchaseSchema>;
export type FinancingOfferFormData = z.infer<typeof financingOfferSchema>;
export type ComparisonFormData = z.infer<typeof comparisonSchema>;
