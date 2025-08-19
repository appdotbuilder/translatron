import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { translationsTable } from '../db/schema';
import { type CreateTranslationInput } from '../schema';
import { createTranslation } from '../handlers/create_translation';
import { eq } from 'drizzle-orm';

// Test inputs
const englishToChinese: CreateTranslationInput = {
  source_text: 'hello',
  source_language: 'en',
  target_language: 'zh',
  user_id: 'user123'
};

const chineseToEnglish: CreateTranslationInput = {
  source_text: '你好',
  source_language: 'zh',
  target_language: 'en',
  user_id: 'user456'
};

const anonymousTranslation: CreateTranslationInput = {
  source_text: 'thank you',
  source_language: 'en',
  target_language: 'zh'
  // user_id is undefined (anonymous user)
};

describe('createTranslation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an English to Chinese translation with user', async () => {
    const result = await createTranslation(englishToChinese);

    // Verify returned data structure
    expect(result.source_text).toEqual('hello');
    expect(result.translated_text).toEqual('你好');
    expect(result.source_language).toEqual('en');
    expect(result.target_language).toEqual('zh');
    expect(result.user_id).toEqual('user123');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a Chinese to English translation with user', async () => {
    const result = await createTranslation(chineseToEnglish);

    // Verify returned data structure
    expect(result.source_text).toEqual('你好');
    expect(result.translated_text).toEqual('hello');
    expect(result.source_language).toEqual('zh');
    expect(result.target_language).toEqual('en');
    expect(result.user_id).toEqual('user456');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create anonymous translation with null user_id', async () => {
    const result = await createTranslation(anonymousTranslation);

    // Verify anonymous user handling
    expect(result.source_text).toEqual('thank you');
    expect(result.translated_text).toEqual('谢谢');
    expect(result.source_language).toEqual('en');
    expect(result.target_language).toEqual('zh');
    expect(result.user_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save translation to database', async () => {
    const result = await createTranslation(englishToChinese);

    // Verify database persistence
    const savedTranslations = await db.select()
      .from(translationsTable)
      .where(eq(translationsTable.id, result.id))
      .execute();

    expect(savedTranslations).toHaveLength(1);
    const saved = savedTranslations[0];
    expect(saved.source_text).toEqual('hello');
    expect(saved.translated_text).toEqual('你好');
    expect(saved.source_language).toEqual('en');
    expect(saved.target_language).toEqual('zh');
    expect(saved.user_id).toEqual('user123');
    expect(saved.created_at).toBeInstanceOf(Date);
  });

  it('should handle unknown text with fallback translation', async () => {
    const unknownInput: CreateTranslationInput = {
      source_text: 'unknown phrase',
      source_language: 'en',
      target_language: 'zh',
      user_id: 'user789'
    };

    const result = await createTranslation(unknownInput);

    // Verify fallback translation logic
    expect(result.source_text).toEqual('unknown phrase');
    expect(result.translated_text).toEqual('unknown phrase的中文翻译');
    expect(result.source_language).toEqual('en');
    expect(result.target_language).toEqual('zh');
    expect(result.user_id).toEqual('user789');
  });

  it('should create multiple translations independently', async () => {
    // Create multiple translations
    const result1 = await createTranslation(englishToChinese);
    const result2 = await createTranslation(chineseToEnglish);
    const result3 = await createTranslation(anonymousTranslation);

    // Verify all have unique IDs
    const ids = [result1.id, result2.id, result3.id];
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toEqual(3);

    // Verify database contains all three
    const allTranslations = await db.select()
      .from(translationsTable)
      .execute();

    expect(allTranslations).toHaveLength(3);

    // Verify each translation is correctly stored
    const englishTranslation = allTranslations.find(t => t.source_text === 'hello');
    const chineseTranslation = allTranslations.find(t => t.source_text === '你好');
    const anonymousTranslationRecord = allTranslations.find(t => t.source_text === 'thank you');

    expect(englishTranslation).toBeDefined();
    expect(englishTranslation!.user_id).toEqual('user123');
    
    expect(chineseTranslation).toBeDefined();
    expect(chineseTranslation!.user_id).toEqual('user456');
    
    expect(anonymousTranslationRecord).toBeDefined();
    expect(anonymousTranslationRecord!.user_id).toBeNull();
  });

  it('should handle explicit null user_id input', async () => {
    const nullUserInput: CreateTranslationInput = {
      source_text: 'goodbye',
      source_language: 'en',
      target_language: 'zh',
      user_id: null
    };

    const result = await createTranslation(nullUserInput);

    // Verify null user_id is handled correctly
    expect(result.source_text).toEqual('goodbye');
    expect(result.translated_text).toEqual('再见');
    expect(result.user_id).toBeNull();

    // Verify in database
    const saved = await db.select()
      .from(translationsTable)
      .where(eq(translationsTable.id, result.id))
      .execute();

    expect(saved[0].user_id).toBeNull();
  });

  it('should preserve exact source text formatting', async () => {
    const formattedInput: CreateTranslationInput = {
      source_text: '  Hello World!  ',
      source_language: 'en',
      target_language: 'zh',
      user_id: 'user999'
    };

    const result = await createTranslation(formattedInput);

    // Should preserve original formatting
    expect(result.source_text).toEqual('  Hello World!  ');
    
    // Verify in database
    const saved = await db.select()
      .from(translationsTable)
      .where(eq(translationsTable.id, result.id))
      .execute();

    expect(saved[0].source_text).toEqual('  Hello World!  ');
  });
});