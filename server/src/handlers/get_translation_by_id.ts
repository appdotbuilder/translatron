import { db } from '../db';
import { translationsTable } from '../db/schema';
import { type Translation } from '../schema';
import { eq } from 'drizzle-orm';

export const getTranslationById = async (id: number, userId?: string): Promise<Translation | null> => {
  try {
    // Fetch translation by ID
    const result = await db.select()
      .from(translationsTable)
      .where(eq(translationsTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const translation = result[0];

    // Check access permissions:
    // - If userId is provided, user can access their own translations or public ones (user_id is null)
    // - If userId is not provided, only public translations are accessible
    if (userId) {
      // User can access their own translations or public ones
      if (translation.user_id !== null && translation.user_id !== userId) {
        return null; // Translation belongs to another user
      }
    } else {
      // Anonymous user can only access public translations
      if (translation.user_id !== null) {
        return null; // Translation is private
      }
    }

    return {
      id: translation.id,
      source_text: translation.source_text,
      translated_text: translation.translated_text,
      source_language: translation.source_language,
      target_language: translation.target_language,
      user_id: translation.user_id,
      created_at: translation.created_at
    };
  } catch (error) {
    console.error('Failed to get translation by id:', error);
    throw error;
  }
};