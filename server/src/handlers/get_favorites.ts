import { db } from '../db';
import { translationsTable, favoriteTranslationsTable } from '../db/schema';
import { type GetFavoritesInput, type TranslationWithFavorite } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getFavorites = async (input: GetFavoritesInput): Promise<TranslationWithFavorite[]> => {
  try {
    // Build the complete query in one chain to avoid TypeScript issues
    const results = await db.select()
      .from(favoriteTranslationsTable)
      .innerJoin(
        translationsTable, 
        eq(favoriteTranslationsTable.translation_id, translationsTable.id)
      )
      .where(eq(favoriteTranslationsTable.user_id, input.user_id))
      .orderBy(desc(favoriteTranslationsTable.created_at))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Map the joined results to TranslationWithFavorite format
    return results.map(result => ({
      id: result.translations.id,
      source_text: result.translations.source_text,
      translated_text: result.translations.translated_text,
      source_language: result.translations.source_language,
      target_language: result.translations.target_language,
      user_id: result.translations.user_id,
      created_at: result.translations.created_at,
      is_favorite: true // All returned records are favorites
    }));
  } catch (error) {
    console.error('Get favorites failed:', error);
    throw error;
  }
};