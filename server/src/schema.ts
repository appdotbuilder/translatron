import { z } from 'zod';

// Translation schema
export const translationSchema = z.object({
  id: z.number(),
  source_text: z.string(),
  translated_text: z.string(),
  source_language: z.enum(['zh', 'en']), // Chinese or English
  target_language: z.enum(['zh', 'en']),
  created_at: z.coerce.date(),
  user_id: z.string().nullable() // Nullable for anonymous users
});

export type Translation = z.infer<typeof translationSchema>;

// Input schema for creating translations
export const createTranslationInputSchema = z.object({
  source_text: z.string().min(1, 'Source text cannot be empty'),
  source_language: z.enum(['zh', 'en']),
  target_language: z.enum(['zh', 'en']),
  user_id: z.string().nullable().optional() // Can be null or undefined
}).refine(data => data.source_language !== data.target_language, {
  message: "Source and target languages must be different"
});

export type CreateTranslationInput = z.infer<typeof createTranslationInputSchema>;

// Favorite translation schema
export const favoriteTranslationSchema = z.object({
  id: z.number(),
  translation_id: z.number(),
  user_id: z.string(),
  created_at: z.coerce.date()
});

export type FavoriteTranslation = z.infer<typeof favoriteTranslationSchema>;

// Input schema for creating favorites
export const createFavoriteInputSchema = z.object({
  translation_id: z.number(),
  user_id: z.string()
});

export type CreateFavoriteInput = z.infer<typeof createFavoriteInputSchema>;

// Input schema for deleting favorites
export const deleteFavoriteInputSchema = z.object({
  translation_id: z.number(),
  user_id: z.string()
});

export type DeleteFavoriteInput = z.infer<typeof deleteFavoriteInputSchema>;

// Schema for getting translation history
export const getTranslationHistoryInputSchema = z.object({
  user_id: z.string().nullable().optional(), // Can be null or undefined
  limit: z.number().int().positive().optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0)
});

export type GetTranslationHistoryInput = z.infer<typeof getTranslationHistoryInputSchema>;

// Schema for getting favorites
export const getFavoritesInputSchema = z.object({
  user_id: z.string(),
  limit: z.number().int().positive().optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0)
});

export type GetFavoritesInput = z.infer<typeof getFavoritesInputSchema>;

// Translation with favorite status (for UI)
export const translationWithFavoriteSchema = z.object({
  id: z.number(),
  source_text: z.string(),
  translated_text: z.string(),
  source_language: z.enum(['zh', 'en']),
  target_language: z.enum(['zh', 'en']),
  created_at: z.coerce.date(),
  user_id: z.string().nullable(), // Nullable for anonymous users
  is_favorite: z.boolean()
});

export type TranslationWithFavorite = z.infer<typeof translationWithFavoriteSchema>;