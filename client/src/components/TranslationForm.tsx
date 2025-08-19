import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { Translation, CreateTranslationInput } from '../../../server/src/schema';

interface TranslationFormProps {
  userId: string;
  onTranslationCreated: (translation: Translation) => void;
}

// Mock translation function (placeholder)
const mockTranslate = async (text: string, sourceLang: 'zh' | 'en', targetLang: 'zh' | 'en'): Promise<string> => {
  // This is a mock implementation - in a real app, this would call a translation API
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
  
  if (sourceLang === 'zh' && targetLang === 'en') {
    return `[EN] ${text}`; // Placeholder for Chinese to English
  } else {
    return `[中文] ${text}`; // Placeholder for English to Chinese
  }
};

export function TranslationForm({ userId, onTranslationCreated }: TranslationFormProps) {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState<'zh' | 'en'>('zh');
  const [targetLang, setTargetLang] = useState<'zh' | 'en'>('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRealTime, setIsRealTime] = useState(false);

  // Real-time translation with debouncing
  useEffect(() => {
    if (!isRealTime || !sourceText.trim()) {
      setTranslatedText('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsTranslating(true);
      try {
        const result = await mockTranslate(sourceText, sourceLang, targetLang);
        setTranslatedText(result);
      } catch (error) {
        console.error('Real-time translation error:', error);
      } finally {
        setIsTranslating(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [sourceText, sourceLang, targetLang, isRealTime]);

  const handleLanguageSwap = useCallback(() => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  }, [sourceLang, targetLang, sourceText, translatedText]);

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) return;

    setIsTranslating(true);
    try {
      // Save to database and get translation from server
      const createInput: CreateTranslationInput = {
        source_text: sourceText,
        source_language: sourceLang,
        target_language: targetLang,
        user_id: userId
      };

      const savedTranslation = await trpc.createTranslation.mutate(createInput);
      setTranslatedText(savedTranslation.translated_text);
      onTranslationCreated(savedTranslation);
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang, userId, onTranslationCreated]);

  const handleSpeak = useCallback((text: string, lang: 'zh' | 'en') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
      speechSynthesis.speak(utterance);
    }
  }, []);

  const handleClear = useCallback(() => {
    setSourceText('');
    setTranslatedText('');
  }, []);

  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div className="flex items-center justify-center gap-4">
        <Select value={sourceLang} onValueChange={(value: 'zh' | 'en') => setSourceLang(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zh">🇨🇳 中文</SelectItem>
            <SelectItem value="en">🇺🇸 English</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLanguageSwap}
          className="px-4 hover:bg-blue-50"
        >
          🔄
        </Button>
        
        <Select value={targetLang} onValueChange={(value: 'zh' | 'en') => setTargetLang(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zh">🇨🇳 中文</SelectItem>
            <SelectItem value="en">🇺🇸 English</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Translation Interface */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Source Text */}
        <Card className="border-blue-200 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {sourceLang === 'zh' ? '🇨🇳 中文' : '🇺🇸 English'}
              </Badge>
              {sourceText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSpeak(sourceText, sourceLang)}
                  className="h-8 px-2 hover:bg-blue-50"
                >
                  🔊
                </Button>
              )}
            </div>
            <Textarea
              placeholder={sourceLang === 'zh' ? '请输入中文文本...' : 'Enter English text...'}
              value={sourceText}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSourceText(e.target.value)}
              className="min-h-32 resize-none border-0 focus-visible:ring-0 text-base"
            />
          </CardContent>
        </Card>

        {/* Target Text */}
        <Card className="border-green-200 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {targetLang === 'zh' ? '🇨🇳 中文' : '🇺🇸 English'}
              </Badge>
              {translatedText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSpeak(translatedText, targetLang)}
                  className="h-8 px-2 hover:bg-green-50"
                >
                  🔊
                </Button>
              )}
            </div>
            <Textarea
              placeholder={isTranslating ? '正在翻译中... / Translating...' : (targetLang === 'zh' ? '翻译结果将显示在这里...' : 'Translation will appear here...')}
              value={translatedText}
              readOnly
              className="min-h-32 resize-none border-0 focus-visible:ring-0 text-base bg-gray-50"
            />
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <Button
          onClick={handleTranslate}
          disabled={!sourceText.trim() || isTranslating || sourceLang === targetLang}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
        >
          {isTranslating ? '🔄 翻译中...' : '🚀 翻译 / Translate'}
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setIsRealTime(!isRealTime)}
          className={isRealTime ? 'bg-green-50 border-green-300 text-green-700' : ''}
        >
          {isRealTime ? '⚡ 实时翻译 ON' : '⚡ 实时翻译 OFF'}
        </Button>
        
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={!sourceText && !translatedText}
          className="hover:bg-red-50 hover:text-red-600"
        >
          🗑️ 清空 / Clear
        </Button>
      </div>

      {/* Info */}
      {sourceLang === targetLang && (
        <div className="text-center text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
          ⚠️ 请选择不同的源语言和目标语言 / Please select different source and target languages
        </div>
      )}
    </div>
  );
}