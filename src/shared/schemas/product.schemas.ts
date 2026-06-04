/**
 * Product Validation Schemas
 * Split by feature for better code organization and potential lazy loading
 *
 * Benefits:
 * - Reusable across multiple routers/components
 * - Single source of truth for validation
 * - Better tree-shaking in production builds
 * - Easier to maintain and test
 */

import { z } from 'zod'
import { ITEM_TYPES } from '@/domain/catalog/value-objects/item-type'
import { STOCK_BEHAVIORS } from '@/domain/catalog/value-objects/stock-behavior'
import { PRICING_MODELS } from '@/domain/catalog/value-objects/pricing-model'

// ============================================================================
// Base Product Schemas
// ============================================================================

export const ProductIdSchema = z.object({
  id: z.string().uuid('Invalid product ID format'),
})

export const ProductSkuSchema = z
  .string()
  .min(1, 'SKU is required')
  .max(50, 'SKU must be 50 characters or less')
  .regex(/^[A-Z0-9-]+$/, 'SKU must contain only uppercase letters, numbers, and hyphens')

export const ProductNameSchema = z
  .string()
  .min(1, 'Product name is required')
  .max(200, 'Product name must be 200 characters or less')

export const ProductCategorySchema = z
  .string()
  .max(100, 'Category name must be 100 characters or less')
  .optional()

export const ProductPriceSchema = z
  .number()
  .positive('Price must be greater than zero')
  .max(1000000000, 'Price exceeds maximum allowed value')

// ============================================================================
// Modular POS Schemas
// ============================================================================

export const ItemTypeSchema = z.enum(ITEM_TYPES as [string, ...string[]])
export const StockBehaviorSchema = z.enum(STOCK_BEHAVIORS as [string, ...string[]])
export const PricingModelSchema = z.enum(PRICING_MODELS as [string, ...string[]])

export const PricingTierSchema = z.object({
  minQuantity: z.number().positive('minQuantity must be positive'),
  pricePerUnit: z.number().positive('pricePerUnit must be positive'),
})

/**
 * Validate that item type + stock behavior + pricing model combination is valid.
 * Returns true if valid, throws ZodError with descriptive message if invalid.
 */
export const ItemTypeComboSchema = z.object({
  itemType: ItemTypeSchema,
  stockBehavior: StockBehaviorSchema,
  pricingModel: PricingModelSchema,
}).refine(
  (data) => {
    // SERVICE items cannot have tracked stock
    if (data.itemType === 'SERVICE' && data.stockBehavior === 'TRACKED') return false
    // PRODUCT items cannot use CONSUMED stock behavior
    if (data.itemType === 'PRODUCT' && data.stockBehavior === 'CONSUMED') return false
    // SERVICE items cannot use TIERED pricing
    if (data.itemType === 'SERVICE' && data.pricingModel === 'TIERED') return false
    // MENU items cannot use TIME_BASED pricing
    if (data.itemType === 'MENU' && data.pricingModel === 'TIME_BASED') return false
    // PACKAGE items cannot use CONSUMED stock
    if (data.itemType === 'PACKAGE' && data.stockBehavior === 'CONSUMED') return false
    return true
  },
  { message: 'Invalid item type, stock behavior, and pricing model combination' },
)

// ============================================================================
// Product Query Schemas
// ============================================================================

export const ProductListQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  itemType: ItemTypeSchema.optional(),
  stockBehavior: StockBehaviorSchema.optional(),
  page: z.number().min(1, 'Page must be at least 1').default(1),
  limit: z.number().min(1).max(100, 'Limit cannot exceed 100').default(50),
}).optional()

export const ProductByIdQuerySchema = ProductIdSchema

// ============================================================================
// Product Mutation Schemas
// ============================================================================

export const CreateProductSchema = z.object({
  sku: ProductSkuSchema,
  name: ProductNameSchema,
  category: ProductCategorySchema,
  price: ProductPriceSchema.optional(),
  itemType: ItemTypeSchema.default('PRODUCT'),
  stockBehavior: StockBehaviorSchema.default('TRACKED'),
  pricingModel: PricingModelSchema.default('FIXED'),
  pricingTiers: z.array(PricingTierSchema).optional(),
  durationMinutes: z.number().positive().optional(),
})

export const UpdateProductSchema = z.object({
  id: z.string().uuid('Invalid product ID format'),
  sku: ProductSkuSchema,
  name: ProductNameSchema,
  category: ProductCategorySchema,
  price: ProductPriceSchema.optional(),
  itemType: ItemTypeSchema.optional(),
  stockBehavior: StockBehaviorSchema.optional(),
  pricingModel: PricingModelSchema.optional(),
  pricingTiers: z.array(PricingTierSchema).optional(),
  durationMinutes: z.number().positive().optional(),
})

export const DeleteProductSchema = ProductIdSchema

// ============================================================================
// Product Filter Schemas
// ============================================================================

export const ProductFilterSchema = z.object({
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  categories: z.array(z.string()).optional(),
  inStock: z.boolean().optional(),
  itemType: ItemTypeSchema.optional(),
  stockBehavior: StockBehaviorSchema.optional(),
})

// ============================================================================
// Bulk Operations Schemas
// ============================================================================

export const BulkCreateProductsSchema = z.object({
  products: z.array(CreateProductSchema).min(1).max(100),
})

export const BulkUpdateProductsSchema = z.object({
  products: z.array(UpdateProductSchema).min(1).max(100),
})

export const BulkDeleteProductsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
})

// ============================================================================
// Type Exports
// ============================================================================

export type ProductListQuery = z.infer<typeof ProductListQuerySchema>
export type ProductByIdQuery = z.infer<typeof ProductByIdQuerySchema>
export type CreateProduct = z.infer<typeof CreateProductSchema>
export type UpdateProduct = z.infer<typeof UpdateProductSchema>
export type DeleteProduct = z.infer<typeof DeleteProductSchema>
export type ProductFilter = z.infer<typeof ProductFilterSchema>
export type BulkCreateProducts = z.infer<typeof BulkCreateProductsSchema>
export type BulkUpdateProducts = z.infer<typeof BulkUpdateProductsSchema>
export type BulkDeleteProducts = z.infer<typeof BulkDeleteProductsSchema>
export type PricingTier = z.infer<typeof PricingTierSchema>
