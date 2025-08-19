import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { translationsTable, favoriteTranslationsTable } from '../db/schema';
import { type GetFavoritesInput } from '../schema';
import { getFavorites } from '../handlers/get_favorites';

describe('getFavorites', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test translations
  const createTestTranslation = async (data: {
    source_text: string;
    translated_text: string;
    source_language: 'zh' | 'en';
    target_language: 'zh' | 'en';
    user_id?: string | null;
  }) => {
    const result = await db.insert(translationsTable)
      .values({
        source_text: data.source_text,
        translated_text: data.translated_text,
        source_language: data.source_language,
        target_language: data.target_language,
        user_id: data.user_id || null
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test favorite
  const createTestFavorite = async (translation_id: number, user_id: string) => {
    const result = await db.insert(favoriteTranslationsTable)
      .values({
        translation_id,
        user_id
      })
      .returning()
      .execute();
    return result[0];
  };

  const testInput: GetFavoritesInput = {
    user_id: 'test-user-123',
    limit: 50,
    offset: 0
  };

  it('should return empty array when user has no favorites', async () => {
    const result = await getFavorites(testInput);

    expect(result).toEqual([]);
  });

  it('should return favorites for specific user', async () => {
    // Create test translations
    const translation1 = await createTestTranslation({
      source_text: 'Hello',
      translated_text: '你好',
      source_language: 'en',
      target_language: 'zh',
      user_id: 'test-user-123'
    });

    const translation2 = await createTestTranslation({
      source_text: 'Goodbye',
      translated_text: '再见',
      source_language: 'en',
      target_language: 'zh',
      user_id: 'test-user-123'
    });

    // Create favorites
    await createTestFavorite(translation1.id, 'test-user-123');
    await createTestFavorite(translation2.id, 'test-user-123');

    const result = await getFavorites(testInput);

    expect(result).toHaveLength(2);
    expect(result[0].source_text).toEqual('Goodbye'); // Newest first
    expect(result[0].translated_text).toEqual('再见');
    expect(result[0].is_favorite).toBe(true);
    expect(result[1].source_text).toEqual('Hello'); // Oldest second
    expect(result[1].translated_text).toEqual('你好');
    expect(result[1].is_favorite).toBe(true);
  });

  it('should only return favorites for specified user', async () => {
    // Create translations for different users
    const translation1 = await createTestTranslation({
      source_text: 'Hello',
      translated_text: '你好',
      source_language: 'en',
      target_language: 'zh',
      user_id: 'user-1'
    });

    const translation2 = await createTestTranslation({
      source_text: 'Thanks',
      translated_text: '谢谢',
      source_language: 'en',
      target_language: 'zh',
      user_id: 'user-2'
    });

    // Create favorites for different users
    await createTestFavorite(translation1.id, 'user-1');
    await createTestFavorite(translation2.id, 'user-2');

    // Query for user-1's favorites
    const result = await getFavorites({
      user_id: 'user-1',
      limit: 50,
      offset: 0
    });

    expect(result).toHaveLength(1);
    expect(result[0].source_text).toEqual('Hello');
    expect(result[0].user_id).toEqual('user-1');
  });

  it('should apply pagination correctly', async () => {
    // Create 3 test translations
    const translations = await Promise.all([
      createTestTranslation({
        source_text: 'First',
        translated_text: '第一',
        source_language: 'en',
        target_language: 'zh'
      }),
      createTestTranslation({
        source_text: 'Second',
        translated_text: '第二',
        source_language: 'en',
        target_language: 'zh'
      }),
      createTestTranslation({
        source_text: 'Third',
        translated_text: '第三',
        source_language: 'en',
        target_language: 'zh'
      })
    ]);

    // Create favorites (in order)
    for (const translation of translations) {
      await createTestFavorite(translation.id, 'test-user-123');
    }

    // Test limit
    const limitedResult = await getFavorites({
      user_id: 'test-user-123',
      limit: 2,
      offset: 0
    });

    expect(limitedResult).toHaveLength(2);
    expect(limitedResult[0].source_text).toEqual('Third'); // Newest first

    // Test offset
    const offsetResult = await getFavorites({
      user_id: 'test-user-123',
      limit: 2,
      offset: 1
    });

    expect(offsetResult).toHaveLength(2);
    expect(offsetResult[0].source_text).toEqual('Second');
    expect(offsetResult[1].source_text).toEqual('First');
  });

  it('should order by favorite creation date (newest first)', async () => {
    // Create translations
    const translation1 = await createTestTranslation({
      source_text: 'First translation',
      translated_text: '第一个翻译',
      source_language: 'en',
      target_language: 'zh'
    });

    const translation2 = await createTestTranslation({
      source_text: 'Second translation',
      translated_text: '第二个翻译',
      source_language: 'en',
      target_language: 'zh'
    });

    // Create favorites with delay to ensure different timestamps
    await createTestFavorite(translation1.id, 'test-user-123');
    
    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await createTestFavorite(translation2.id, 'test-user-123');

    const result = await getFavorites(testInput);

    expect(result).toHaveLength(2);
    // Second favorite should come first (newest)
    expect(result[0].source_text).toEqual('Second translation');
    expect(result[1].source_text).toEqual('First translation');
  });

  it('should include all translation fields and set is_favorite to true', async () => {
    const translation = await createTestTranslation({
      source_text: 'Test text',
      translated_text: '测试文本',
      source_language: 'en',
      target_language: 'zh',
      user_id: 'translation-owner'
    });

    await createTestFavorite(translation.id, 'test-user-123');

    const result = await getFavorites(testInput);

    expect(result).toHaveLength(1);
    const favorite = result[0];

    // Check all fields are present and correct
    expect(favorite.id).toEqual(translation.id);
    expect(favorite.source_text).toEqual('Test text');
    expect(favorite.translated_text).toEqual('测试文本');
    expect(favorite.source_language).toEqual('en');
    expect(favorite.target_language).toEqual('zh');
    expect(favorite.user_id).toEqual('translation-owner');
    expect(favorite.created_at).toBeInstanceOf(Date);
    expect(favorite.is_favorite).toBe(true);
  });

  it('should handle anonymous translations in favorites', async () => {
    const translation = await createTestTranslation({
      source_text: 'Anonymous text',
      translated_text: '匿名文本',
      source_language: 'en',
      target_language: 'zh',
      user_id: null // Anonymous translation
    });

    await createTestFavorite(translation.id, 'test-user-123');

    const result = await getFavorites(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBeNull();
    expect(result[0].source_text).toEqual('Anonymous text');
    expect(result[0].is_favorite).toBe(true);
  });
});