import { db } from '../db';
import { translationsTable } from '../db/schema';
import { type CreateTranslationInput, type Translation } from '../schema';

export const createTranslation = async (input: CreateTranslationInput): Promise<Translation> => {
  try {
    // Mock translation logic - in a real implementation, this would call a translation API
    // For now, we'll provide basic mock translations
    const mockTranslatedText = getMockTranslation(input.source_text, input.source_language, input.target_language);

    // Insert translation record into database
    const result = await db.insert(translationsTable)
      .values({
        source_text: input.source_text,
        translated_text: mockTranslatedText,
        source_language: input.source_language,
        target_language: input.target_language,
        user_id: input.user_id ?? null // Handle optional user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Translation creation failed:', error);
    throw error;
  }
};

// Mock translation function - in a real app, this would call an external translation service
function getMockTranslation(sourceText: string, sourceLanguage: string, targetLanguage: string): string {
  // Simple mock translations for testing
  if (sourceLanguage === 'en' && targetLanguage === 'zh') {
    // English to Chinese
    const translations: Record<string, string> = {
      'hello': '你好',
      'goodbye': '再见',
      'thank you': '谢谢',
      'how are you': '你好吗',
      'good morning': '早上好'
    };
    
    const lowerText = sourceText.toLowerCase();
    return translations[lowerText] || `${sourceText}的中文翻译`;
  } else if (sourceLanguage === 'zh' && targetLanguage === 'en') {
    // Chinese to English
    const translations: Record<string, string> = {
      '你好': 'hello',
      '再见': 'goodbye', 
      '谢谢': 'thank you',
      '你好吗': 'how are you',
      '早上好': 'good morning'
    };
    
    return translations[sourceText] || `English translation of ${sourceText}`;
  }
  
  return `Mock translation from ${sourceLanguage} to ${targetLanguage}: ${sourceText}`;
}