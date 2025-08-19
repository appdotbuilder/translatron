import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { translationsTable } from '../db/schema';
import { getTranslationById } from '../handlers/get_translation_by_id';

// Test translation data for database insertion (includes translated_text)
const publicTranslationData = {
  source_text: 'Hello World',
  translated_text: '你好世界',
  source_language: 'en' as const,
  target_language: 'zh' as const,
  user_id: null // Public translation
};

const userTranslationData = {
  source_text: 'Good morning',
  translated_text: '早上好',
  source_language: 'en' as const,
  target_language: 'zh' as const,
  user_id: 'user123' // Private translation
};

const otherUserTranslationData = {
  source_text: 'Good evening',
  translated_text: '晚上好',
  source_language: 'en' as const,
  target_language: 'zh' as const,
  user_id: 'user456' // Other user's translation
};

describe('getTranslationById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent translation', async () => {
    const result = await getTranslationById(9999);

    expect(result).toBeNull();
  });

  it('should return public translation for anonymous user', async () => {
    // Create a public translation
    const insertResult = await db.insert(translationsTable)
      .values(publicTranslationData)
      .returning()
      .execute();

    const translationId = insertResult[0].id;

    // Anonymous user should be able to access public translation
    const result = await getTranslationById(translationId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(translationId);
    expect(result!.source_text).toBe('Hello World');
    expect(result!.translated_text).toBe('你好世界');
    expect(result!.source_language).toBe('en');
    expect(result!.target_language).toBe('zh');
    expect(result!.user_id).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null for private translation when accessed anonymously', async () => {
    // Create a private translation
    const insertResult = await db.insert(translationsTable)
      .values(userTranslationData)
      .returning()
      .execute();

    const translationId = insertResult[0].id;

    // Anonymous user should NOT be able to access private translation
    const result = await getTranslationById(translationId);

    expect(result).toBeNull();
  });

  it('should return user own translation', async () => {
    // Create a user's translation
    const insertResult = await db.insert(translationsTable)
      .values(userTranslationData)
      .returning()
      .execute();

    const translationId = insertResult[0].id;

    // User should be able to access their own translation
    const result = await getTranslationById(translationId, 'user123');

    expect(result).not.toBeNull();
    expect(result!.id).toBe(translationId);
    expect(result!.source_text).toBe('Good morning');
    expect(result!.translated_text).toBe('早上好');
    expect(result!.user_id).toBe('user123');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return public translation for authenticated user', async () => {
    // Create a public translation
    const insertResult = await db.insert(translationsTable)
      .values(publicTranslationData)
      .returning()
      .execute();

    const translationId = insertResult[0].id;

    // Authenticated user should be able to access public translation
    const result = await getTranslationById(translationId, 'user123');

    expect(result).not.toBeNull();
    expect(result!.id).toBe(translationId);
    expect(result!.source_text).toBe('Hello World');
    expect(result!.user_id).toBeNull();
  });

  it('should return null when user tries to access another user translation', async () => {
    // Create another user's translation
    const insertResult = await db.insert(translationsTable)
      .values(otherUserTranslationData)
      .returning()
      .execute();

    const translationId = insertResult[0].id;

    // User should NOT be able to access another user's translation
    const result = await getTranslationById(translationId, 'user123');

    expect(result).toBeNull();
  });

  it('should handle database query correctly', async () => {
    // Create multiple translations to test specific ID lookup
    const translations = [publicTranslationData, userTranslationData, otherUserTranslationData];
    
    const insertResults = [];
    for (const translation of translations) {
      const result = await db.insert(translationsTable)
        .values(translation)
        .returning()
        .execute();
      insertResults.push(result[0]);
    }

    // Get the middle translation
    const targetId = insertResults[1].id;
    const result = await getTranslationById(targetId, 'user123');

    expect(result).not.toBeNull();
    expect(result!.id).toBe(targetId);
    expect(result!.source_text).toBe('Good morning');
    expect(result!.user_id).toBe('user123');

    // Verify it's the correct specific record, not just any record
    expect(result!.source_text).not.toBe('Hello World');
    expect(result!.source_text).not.toBe('Good evening');
  });
});