import { db } from '../db';
import { favoriteTranslationsTable } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { type DeleteFavoriteInput } from '../schema';

export const deleteFavorite = async (input: DeleteFavoriteInput): Promise<{ success: boolean }> => {
  try {
    // Delete the favorite record matching both translation_id and user_id
    const result = await db.delete(favoriteTranslationsTable)
      .where(
        and(
          eq(favoriteTranslationsTable.translation_id, input.translation_id),
          eq(favoriteTranslationsTable.user_id, input.user_id)
        )
      )
      .execute();

    // Check if any rows were affected (deleted)
    const success = (result.rowCount ?? 0) > 0;
    
    return { success };
  } catch (error) {
    console.error('Delete favorite failed:', error);
    throw error;
  }
};