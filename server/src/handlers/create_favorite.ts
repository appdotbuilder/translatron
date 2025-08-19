import { db } from '../db';
import { translationsTable, favoriteTranslationsTable } from '../db/schema';
import { type CreateFavoriteInput, type FavoriteTranslation } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createFavorite = async (input: CreateFavoriteInput): Promise<FavoriteTranslation> => {
  try {
    // 1. Check if the translation exists
    const translation = await db.select()
      .from(translationsTable)
      .where(eq(translationsTable.id, input.translation_id))
      .execute();

    if (translation.length === 0) {
      throw new Error('Translation not found');
    }

    // 2. Check if the favorite already exists to prevent duplicates
    const existingFavorite = await db.select()
      .from(favoriteTranslationsTable)
      .where(
        and(
          eq(favoriteTranslationsTable.translation_id, input.translation_id),
          eq(favoriteTranslationsTable.user_id, input.user_id)
        )
      )
      .execute();

    if (existingFavorite.length > 0) {
      throw new Error('Translation is already favorited by this user');
    }

    // 3. Create a new favorite record in the database
    const result = await db.insert(favoriteTranslationsTable)
      .values({
        translation_id: input.translation_id,
        user_id: input.user_id
      })
      .returning()
      .execute();

    // 4. Return the created favorite record
    return result[0];
  } catch (error) {
    console.error('Favorite creation failed:', error);
    throw error;
  }
};