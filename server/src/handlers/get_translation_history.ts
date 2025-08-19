import { db } from '../db';
import { translationsTable, favoriteTranslationsTable } from '../db/schema';
import { type GetTranslationHistoryInput, type TranslationWithFavorite } from '../schema';
import { desc, eq, and, isNull, type SQL } from 'drizzle-orm';

export async function getTranslationHistory(input: GetTranslationHistoryInput): Promise<TranslationWithFavorite[]> {
  try {
    // Build the base query
    const baseQuery = db.select({
      id: translationsTable.id,
      source_text: translationsTable.source_text,
      translated_text: translationsTable.translated_text,
      source_language: translationsTable.source_language,
      target_language: translationsTable.target_language,
      user_id: translationsTable.user_id,
      created_at: translationsTable.created_at,
      favorite_id: favoriteTranslationsTable.id // This will be null if not favorited
    })
    .from(translationsTable)
    .leftJoin(
      favoriteTranslationsTable,
      and(
        eq(favoriteTranslationsTable.translation_id, translationsTable.id),
        // Only join favorites for the specific user if user_id is provided
        input.user_id ? eq(favoriteTranslationsTable.user_id, input.user_id) : isNull(favoriteTranslationsTable.user_id)
      )
    );

    // Determine if we need to filter by user_id
    const needsFilter = input.user_id !== undefined && input.user_id === null;
    
    // Execute the query with conditional where clause
    const results = needsFilter
      ? await baseQuery
          .where(isNull(translationsTable.user_id))
          .orderBy(desc(translationsTable.created_at))
          .limit(input.limit)
          .offset(input.offset)
          .execute()
      : await baseQuery
          .orderBy(desc(translationsTable.created_at))
          .limit(input.limit)
          .offset(input.offset)
          .execute();

    // Transform results to include is_favorite boolean
    return results.map(result => ({
      id: result.id,
      source_text: result.source_text,
      translated_text: result.translated_text,
      source_language: result.source_language,
      target_language: result.target_language,
      user_id: result.user_id,
      created_at: result.created_at,
      is_favorite: result.favorite_id !== null // True if there's a corresponding favorite record
    }));

  } catch (error) {
    console.error('Translation history retrieval failed:', error);
    throw error;
  }
}