import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { TranslationWithFavorite } from '../../../server/src/schema';

interface TranslationHistoryProps {
  translations: TranslationWithFavorite[];
  onToggleFavorite: (translationId: number, isFavorite: boolean) => Promise<void>;
  isLoading: boolean;
}

export function TranslationHistory({ translations, onToggleFavorite, isLoading }: TranslationHistoryProps) {
  const handleSpeak = (text: string, lang: 'zh' | 'en') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  if (translations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <p className="text-lg text-gray-500 mb-2">
          暂无翻译历史
        </p>
        <p className="text-sm text-gray-400">
          No translation history yet
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] w-full">
      <div className="space-y-4">
        {translations.map((translation: TranslationWithFavorite) => (
          <Card key={translation.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {translation.source_language === 'zh' ? '🇨🇳 中文' : '🇺🇸 EN'} 
                    →
                    {translation.target_language === 'zh' ? '🇨🇳 中文' : '🇺🇸 EN'}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {translation.created_at.toLocaleDateString()} {translation.created_at.toLocaleTimeString()}
                  </span>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleFavorite(translation.id, !translation.is_favorite)}
                  disabled={isLoading}
                  className={`h-8 px-2 ${translation.is_favorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                >
                  {translation.is_favorite ? '⭐' : '☆'}
                </Button>
              </div>

              <div className="space-y-3">
                {/* Source Text */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">
                      {translation.source_language === 'zh' ? '原文 (中文)' : 'Original (English)'}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSpeak(translation.source_text, translation.source_language)}
                        className="h-6 w-6 p-0 hover:bg-blue-100"
                      >
                        🔊
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyText(translation.source_text)}
                        className="h-6 w-6 p-0 hover:bg-blue-100"
                      >
                        📋
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-800">{translation.source_text}</p>
                </div>

                {/* Translated Text */}
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800">
                      {translation.target_language === 'zh' ? '译文 (中文)' : 'Translation (English)'}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSpeak(translation.translated_text, translation.target_language)}
                        className="h-6 w-6 p-0 hover:bg-green-100"
                      >
                        🔊
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyText(translation.translated_text)}
                        className="h-6 w-6 p-0 hover:bg-green-100"
                      >
                        📋
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-800">{translation.translated_text}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}