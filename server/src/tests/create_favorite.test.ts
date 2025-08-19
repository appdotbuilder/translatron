import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { translationsTable, favoriteTranslationsTable } from '../db/schema';
import { type CreateFavoriteInput } from '../schema';
import { createFavorite } from '../handlers/create_favorite';
import { eq, and } from 'drizzle-orm';

// Test data
const testTranslationData = {
  source_text: 'Hello World',
  translated_text: '你好世界',
  source_language: 'en' as const,
  target_language: 'zh' as const,
  user_id: 'user123'
};

const testUserId = 'user123';

describe('createFavorite', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a favorite successfully', async () => {
    // First create a translation
    const translationResult = await db.insert(translationsTable)
      .values(testTranslationData)
      .returning()
      .execute();

    const translation = translationResult[0];

    const input: CreateFavoriteInput = {
      translation_id: translation.id,
      user_id: testUserId
    };

    const result = await createFavorite(input);

    // Verify the result
    expect(result.translation_id).toEqual(translation.id);
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save favorite to database', async () => {
    // Create a translation first
    const translationResult = await db.insert(translationsTable)
      .values(testTranslationData)
      .returning()
      .execute();

    const translation = translationResult[0];

    const input: CreateFavoriteInput = {
      translation_id: translation.id,
      user_id: testUserId
    };

    const result = await createFavorite(input);

    // Query the database to verify the favorite was saved
    const favorites = await db.select()
      .from(favoriteTranslationsTable)
      .where(eq(favoriteTranslationsTable.id, result.id))
      .execute();

    expect(favorites).toHaveLength(1);
    expect(favorites[0].translation_id).toEqual(translation.id);
    expect(favorites[0].user_id).toEqual(testUserId);
    expect(favorites[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when translation does not exist', async () => {
    const input: CreateFavoriteInput = {
      translation_id: 999, // Non-existent translation ID
      user_id: testUserId
    };

    await expect(createFavorite(input)).rejects.toThrow(/translation not found/i);
  });

  it('should throw error when favorite already exists', async () => {
    // Create a translation first
    const translationResult = await db.insert(translationsTable)
      .values(testTranslationData)
      .returning()
      .execute();

    const translation = translationResult[0];

    const input: CreateFavoriteInput = {
      translation_id: translation.id,
      user_id: testUserId
    };

    // Create the favorite once
    await createFavorite(input);

    // Try to create the same favorite again - should throw error
    await expect(createFavorite(input)).rejects.toThrow(/already favorited/i);
  });

  it('should allow different users to favorite the same translation', async () => {
    // Create a translation
    const translationResult = await db.insert(translationsTable)
      .values(testTranslationData)
      .returning()
      .execute();

    const translation = translationResult[0];

    // Create favorite for first user
    const input1: CreateFavoriteInput = {
      translation_id: translation.id,
      user_id: 'user123'
    };

    // Create favorite for second user
    const input2: CreateFavoriteInput = {
      translation_id: translation.id,
      user_id: 'user456'
    };

    const result1 = await createFavorite(input1);
    const result2 = await createFavorite(input2);

    // Both should succeed
    expect(result1.user_id).toEqual('user123');
    expect(result2.user_id).toEqual('user456');
    expect(result1.translation_id).toEqual(translation.id);
    expect(result2.translation_id).toEqual(translation.id);

    // Verify both favorites exist in database
    const favorites = await db.select()
      .from(favoriteTranslationsTable)
      .where(eq(favoriteTranslationsTable.translation_id, translation.id))
      .execute();

    expect(favorites).toHaveLength(2);
  });

  it('should allow same user to favorite different translations', async () => {
    // Create two translations
    const translation1Data = {
      ...testTranslationData,
      source_text: 'Hello'
    };

    const translation2Data = {
      ...testTranslationData,
      source_text: 'Goodbye'
    };

    const translationResult1 = await db.insert(translationsTable)
      .values(translation1Data)
      .returning()
      .execute();

    const translationResult2 = await db.insert(translationsTable)
      .values(translation2Data)
      .returning()
      .execute();

    const translation1 = translationResult1[0];
    const translation2 = translationResult2[0];

    // Create favorites for both translations by the same user
    const input1: CreateFavoriteInput = {
      translation_id: translation1.id,
      user_id: testUserId
    };

    const input2: CreateFavoriteInput = {
      translation_id: translation2.id,
      user_id: testUserId
    };

    const result1 = await createFavorite(input1);
    const result2 = await createFavorite(input2);

    // Both should succeed
    expect(result1.translation_id).toEqual(translation1.id);
    expect(result2.translation_id).toEqual(translation2.id);
    expect(result1.user_id).toEqual(testUserId);
    expect(result2.user_id).toEqual(testUserId);

    // Verify both favorites exist in database
    const favorites = await db.select()
      .from(favoriteTranslationsTable)
      .where(eq(favoriteTranslationsTable.user_id, testUserId))
      .execute();

    expect(favorites).toHaveLength(2);
  });

  it('should work with anonymous user translations', async () => {
    // Create a translation with null user_id (anonymous)
    const anonymousTranslationData = {
      ...testTranslationData,
      user_id: null
    };

    const translationResult = await db.insert(translationsTable)
      .values(anonymousTranslationData)
      .returning()
      .execute();

    const translation = translationResult[0];

    const input: CreateFavoriteInput = {
      translation_id: translation.id,
      user_id: testUserId
    };

    const result = await createFavorite(input);

    // Should succeed - users can favorite anonymous translations
    expect(result.translation_id).toEqual(translation.id);
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });
});