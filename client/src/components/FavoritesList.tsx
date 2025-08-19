import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { TranslationWithFavorite } from '../../../server/src/schema';

interface FavoritesListProps {
  favorites: TranslationWithFavorite[];
  onToggleFavorite: (translationId: number, isFavorite: boolean) => Promise<void>;
  isLoading: boolean;
}

export function FavoritesList({ favorites, onToggleFavorite, isLoading }: FavoritesListProps) {
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

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⭐</div>
        <p className="text-lg text-gray-500 mb-2">
          暂无收藏的翻译
        </p>
        <p className="text-sm text-gray-400">
          No favorite translations yet
        </p>
        <p className="text-xs text-gray-400 mt-2">
          在翻译历史中点击星星图标来收藏翻译
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] w-full">
      <div className="space-y-4">
        {favorites.map((favorite: TranslationWithFavorite) => (
          <Card key={favorite.id} className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-yellow-50 to-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    ⭐ 收藏
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {favorite.source_language === 'zh' ? '🇨🇳 中文' : '🇺🇸 EN'} 
                    →
                    {favorite.target_language === 'zh' ? '🇨🇳 中文' : '🇺🇸 EN'}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {favorite.created_at.toLocaleDateString()} {favorite.created_at.toLocaleTimeString()}
                  </span>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isLoading}
                      className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      🗑️
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>移除收藏 / Remove Favorite</AlertDialogTitle>
                      <AlertDialogDescription>
                        确定要从收藏中移除这个翻译吗？此操作不可撤销。
                        <br />
                        Are you sure you want to remove this translation from favorites? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消 / Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onToggleFavorite(favorite.id, false)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        移除 / Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="space-y-3">
                {/* Source Text */}
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">
                      {favorite.source_language === 'zh' ? '原文 (中文)' : 'Original (English)'}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSpeak(favorite.source_text, favorite.source_language)}
                        className="h-6 w-6 p-0 hover:bg-blue-100"
                      >
                        🔊
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyText(favorite.source_text)}
                        className="h-6 w-6 p-0 hover:bg-blue-100"
                      >
                        📋
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-800">{favorite.source_text}</p>
                </div>

                {/* Translated Text */}
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-green-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800">
                      {favorite.target_language === 'zh' ? '译文 (中文)' : 'Translation (English)'}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSpeak(favorite.translated_text, favorite.target_language)}
                        className="h-6 w-6 p-0 hover:bg-green-100"
                      >
                        🔊
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyText(favorite.translated_text)}
                        className="h-6 w-6 p-0 hover:bg-green-100"
                      >
                        📋
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-800">{favorite.translated_text}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}