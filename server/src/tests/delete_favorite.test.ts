import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { translationsTable, favoriteTranslationsTable } from '../db/schema';
import { type DeleteFavoriteInput } from '../schema';
import { deleteFavorite } from '../handlers/delete_favorite';
import { eq, and } from 'drizzle-orm';

// Test input
const testInput: DeleteFavoriteInput = {
  translation_id: 1,
  user_id: 'user123'
};

describe('deleteFavorite', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete an existing favorite', async () => {
    // Create a translation first
    const translationResult = await db.insert(translationsTable)
      .values({
        source_text: 'Hello',
        translated_text: '你好',
        source_language: 'en',
        target_language: 'zh',
        user_id: 'user123'
      })
      .returning()
      .execute();

    const translationId = translationResult[0].id;

    // Create a favorite record
    await db.insert(favoriteTranslationsTable)
      .values({
        translation_id: translationId,
        user_id: 'user123'
      })
      .execute();

    // Delete the favorite
    const result = await deleteFavorite({
      translation_id: translationId,
      user_id: 'user123'
    });

    expect(result.success).toBe(true);

    // Verify the favorite was deleted from database
    const favorites = await db.select()
      .from(favoriteTranslationsTable)
      .where(
        and(
          eq(favoriteTranslationsTable.translation_id, translationId),
          eq(favoriteTranslationsTable.user_id, 'user123')
        )
      )
      .execute();

    expect(favorites).toHaveLength(0);
  });

  it('should return false when deleting non-existent favorite', async () => {
    // Create a translation but no favorite
    const translationResult = await db.insert(translationsTable)
      .values({
        source_text: 'Hello',
        translated_text: '你好',
        source_language: 'en',
        target_language: 'zh',
        user_id: 'user123'
      })
      .returning()
      .execute();

    const translationId = translationResult[0].id;

    // Try to delete non-existent favorite
    const result = await deleteFavorite({
      translation_id: translationId,
      user_id: 'user123'
    });

    expect(result.success).toBe(false);
  });

  it('should return false when user tries to delete another users favorite', async () => {
    // Create a translation
    const translationResult = await db.insert(translationsTable)
      .values({
        source_text: 'Hello',
        translated_text: '你好',
        source_language: 'en',
        target_language: 'zh',
        user_id: 'user123'
      })
      .returning()
      .execute();

    const translationId = translationResult[0].id;

    // Create a favorite for user123
    await db.insert(favoriteTranslationsTable)
      .values({
        translation_id: translationId,
        user_id: 'user123'
      })
      .execute();

    // Try to delete as different user
    const result = await deleteFavorite({
      translation_id: translationId,
      user_id: 'user456'
    });

    expect(result.success).toBe(false);

    // Verify the original favorite still exists
    const favorites = await db.select()
      .from(favoriteTranslationsTable)
      .where(
        and(
          eq(favoriteTranslationsTable.translation_id, translationId),
          eq(favoriteTranslationsTable.user_id, 'user123')
        )
      )
      .execute();

    expect(favorites).toHaveLength(1);
  });

  it('should return false when translation_id does not exist', async () => {
    // Try to delete favorite for non-existent translation
    const result = await deleteFavorite({
      translation_id: 99999,
      user_id: 'user123'
    });

    expect(result.success).toBe(false);
  });

  it('should only delete the specific favorite record', async () => {
    // Create two translations
    const translation1Result = await db.insert(translationsTable)
      .values({
        source_text: 'Hello',
        translated_text: '你好',
        source_language: 'en',
        target_language: 'zh',
        user_id: 'user123'
      })
      .returning()
      .execute();

    const translation2Result = await db.insert(translationsTable)
      .values({
        source_text: 'Goodbye',
        translated_text: '再见',
        source_language: 'en',
        target_language: 'zh',
        user_id: 'user123'
      })
      .returning()
      .execute();

    const translation1Id = translation1Result[0].id;
    const translation2Id = translation2Result[0].id;

    // Create favorites for both translations
    await db.insert(favoriteTranslationsTable)
      .values([
        {
          translation_id: translation1Id,
          user_id: 'user123'
        },
        {
          translation_id: translation2Id,
          user_id: 'user123'
        }
      ])
      .execute();

    // Delete only the first favorite
    const result = await deleteFavorite({
      translation_id: translation1Id,
      user_id: 'user123'
    });

    expect(result.success).toBe(true);

    // Verify only the first favorite was deleted
    const remainingFavorites = await db.select()
      .from(favoriteTranslationsTable)
      .where(eq(favoriteTranslationsTable.user_id, 'user123'))
      .execute();

    expect(remainingFavorites).toHaveLength(1);
    expect(remainingFavorites[0].translation_id).toBe(translation2Id);
  });

  it('should handle multiple users with favorites for same translation', async () => {
    // Create a translation
    const translationResult = await db.insert(translationsTable)
      .values({
        source_text: 'Hello',
        translated_text: '你好',
        source_language: 'en',
        target_language: 'zh',
        user_id: 'user123'
      })
      .returning()
      .execute();

    const translationId = translationResult[0].id;

    // Create favorites for multiple users
    await db.insert(favoriteTranslationsTable)
      .values([
        {
          translation_id: translationId,
          user_id: 'user123'
        },
        {
          translation_id: translationId,
          user_id: 'user456'
        }
      ])
      .execute();

    // Delete favorite for user123 only
    const result = await deleteFavorite({
      translation_id: translationId,
      user_id: 'user123'
    });

    expect(result.success).toBe(true);

    // Verify user456's favorite still exists
    const remainingFavorites = await db.select()
      .from(favoriteTranslationsTable)
      .where(
        and(
          eq(favoriteTranslationsTable.translation_id, translationId),
          eq(favoriteTranslationsTable.user_id, 'user456')
        )
      )
      .execute();

    expect(remainingFavorites).toHaveLength(1);

    // Verify user123's favorite is gone
    const user123Favorites = await db.select()
      .from(favoriteTranslationsTable)
      .where(
        and(
          eq(favoriteTranslationsTable.translation_id, translationId),
          eq(favoriteTranslationsTable.user_id, 'user123')
        )
      )
      .execute();

    expect(user123Favorites).toHaveLength(0);
  });
});