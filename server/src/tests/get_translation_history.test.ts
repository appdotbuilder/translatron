import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { translationsTable, favoriteTranslationsTable } from '../db/schema';
import { type GetTranslationHistoryInput } from '../schema';
import { getTranslationHistory } from '../handlers/get_translation_history';

describe('getTranslationHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test translations
  const createTranslation = async (sourceText: string, translatedText: string, userId: string | null = null, offsetMinutes = 0) => {
    const createdAt = new Date(Date.now() - offsetMinutes * 60000);
    const result = await db.insert(translationsTable)
      .values({
        source_text: sourceText,
        translated_text: translatedText,
        source_language: 'en',
        target_language: 'zh',
        user_id: userId,
        created_at: createdAt
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create favorites
  const createFavorite = async (translationId: number, userId: string) => {
    const result = await db.insert(favoriteTranslationsTable)
      .values({
        translation_id: translationId,
        user_id: userId
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should return empty array when no translations exist', async () => {
    const input: GetTranslationHistoryInput = {
      limit: 10,
      offset: 0
    };

    const result = await getTranslationHistory(input);
    
    expect(result).toEqual([]);
  });

  it('should return all translations ordered by creation date (newest first)', async () => {
    // Create translations with different timestamps
    const translation1 = await createTranslation('Hello', '你好', null, 60); // 1 hour ago
    const translation2 = await createTranslation('World', '世界', null, 30); // 30 minutes ago
    const translation3 = await createTranslation('Good', '好', null, 10); // 10 minutes ago

    const input: GetTranslationHistoryInput = {
      limit: 10,
      offset: 0
    };

    const result = await getTranslationHistory(input);

    expect(result).toHaveLength(3);
    // Should be ordered newest first
    expect(result[0].id).toEqual(translation3.id);
    expect(result[1].id).toEqual(translation2.id);
    expect(result[2].id).toEqual(translation1.id);
    
    // All should have is_favorite: false since no favorites exist
    result.forEach(translation => {
      expect(translation.is_favorite).toBe(false);
    });
  });

  it('should respect pagination with limit and offset', async () => {
    // Create 5 translations
    for (let i = 0; i < 5; i++) {
      await createTranslation(`Text ${i}`, `文本 ${i}`, null, i * 10);
    }

    // Test first page
    const firstPage = await getTranslationHistory({
      limit: 2,
      offset: 0
    });

    expect(firstPage).toHaveLength(2);

    // Test second page
    const secondPage = await getTranslationHistory({
      limit: 2,
      offset: 2
    });

    expect(secondPage).toHaveLength(2);
    // Should be different translations
    expect(firstPage[0].id).not.toEqual(secondPage[0].id);
    expect(firstPage[1].id).not.toEqual(secondPage[1].id);

    // Test third page (should have 1 item)
    const thirdPage = await getTranslationHistory({
      limit: 2,
      offset: 4
    });

    expect(thirdPage).toHaveLength(1);
  });

  it('should include favorite status when user_id is provided', async () => {
    const userId = 'test-user-123';

    // Create translations
    const translation1 = await createTranslation('Hello', '你好', userId);
    const translation2 = await createTranslation('World', '世界', userId);
    const translation3 = await createTranslation('Good', '好', userId);

    // Mark translation1 and translation3 as favorites
    await createFavorite(translation1.id, userId);
    await createFavorite(translation3.id, userId);

    const input: GetTranslationHistoryInput = {
      user_id: userId,
      limit: 10,
      offset: 0
    };

    const result = await getTranslationHistory(input);

    expect(result).toHaveLength(3);
    
    // Check favorite status
    const translation1Result = result.find(t => t.id === translation1.id);
    const translation2Result = result.find(t => t.id === translation2.id);
    const translation3Result = result.find(t => t.id === translation3.id);

    expect(translation1Result?.is_favorite).toBe(true);
    expect(translation2Result?.is_favorite).toBe(false);
    expect(translation3Result?.is_favorite).toBe(true);
  });

  it('should only show favorites for the specific user', async () => {
    const user1 = 'user1';
    const user2 = 'user2';

    // Create a translation from user1
    const translation = await createTranslation('Hello', '你好', user1);

    // User1 favorites it
    await createFavorite(translation.id, user1);

    // User2 requests history - should not see the favorite status from user1
    const user2Result = await getTranslationHistory({
      user_id: user2,
      limit: 10,
      offset: 0
    });

    // User2 should see the translation but not marked as favorite
    const translationForUser2 = user2Result.find(t => t.id === translation.id);
    expect(translationForUser2?.is_favorite).toBe(false);

    // User1 requests history - should see it as favorite
    const user1Result = await getTranslationHistory({
      user_id: user1,
      limit: 10,
      offset: 0
    });

    const translationForUser1 = user1Result.find(t => t.id === translation.id);
    expect(translationForUser1?.is_favorite).toBe(true);
  });

  it('should handle null user_id (anonymous users)', async () => {
    // Create anonymous translations
    const anonTranslation = await createTranslation('Hello', '你好', null);
    const userTranslation = await createTranslation('World', '世界', 'test-user');

    const input: GetTranslationHistoryInput = {
      user_id: null,
      limit: 10,
      offset: 0
    };

    const result = await getTranslationHistory(input);

    // Should show only anonymous translations when user_id is null
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(anonTranslation.id);
    expect(result[0].user_id).toBeNull();
    expect(result[0].is_favorite).toBe(false); // No favorites for anonymous users
  });

  it('should handle undefined user_id (show all translations)', async () => {
    // Create mixed translations
    await createTranslation('Hello', '你好', null);
    await createTranslation('World', '世界', 'user1');
    await createTranslation('Good', '好', 'user2');

    const input: GetTranslationHistoryInput = {
      user_id: undefined,
      limit: 10,
      offset: 0
    };

    const result = await getTranslationHistory(input);

    // Should show all translations when user_id is undefined
    expect(result).toHaveLength(3);
  });

  it('should return correct translation data structure', async () => {
    const translation = await createTranslation('Test', '测试', 'test-user');

    const result = await getTranslationHistory({
      limit: 10,
      offset: 0
    });

    expect(result).toHaveLength(1);
    const returnedTranslation = result[0];

    // Verify all required fields are present
    expect(returnedTranslation.id).toEqual(translation.id);
    expect(returnedTranslation.source_text).toEqual('Test');
    expect(returnedTranslation.translated_text).toEqual('测试');
    expect(returnedTranslation.source_language).toEqual('en');
    expect(returnedTranslation.target_language).toEqual('zh');
    expect(returnedTranslation.user_id).toEqual('test-user');
    expect(returnedTranslation.created_at).toBeInstanceOf(Date);
    expect(typeof returnedTranslation.is_favorite).toBe('boolean');
  });

  it('should handle default pagination values', async () => {
    // Create more than 50 translations to test default limit
    const promises = [];
    for (let i = 0; i < 55; i++) {
      promises.push(createTranslation(`Text ${i}`, `文本 ${i}`, null, i));
    }
    await Promise.all(promises);

    // Test with minimal input (should use defaults)
    const result = await getTranslationHistory({
      limit: 50, // Default value from Zod schema
      offset: 0  // Default value from Zod schema
    });

    // Should return default limit of 50
    expect(result).toHaveLength(50);
    
    // Should start from offset 0 (default)
    // Verify ordering (newest first)
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].created_at >= result[i].created_at).toBe(true);
    }
  });
});