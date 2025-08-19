import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { TranslationForm } from '@/components/TranslationForm';
import { TranslationHistory } from '@/components/TranslationHistory';
import { FavoritesList } from '@/components/FavoritesList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Translation, TranslationWithFavorite } from '../../server/src/schema';

function App() {
  const [translations, setTranslations] = useState<TranslationWithFavorite[]>([]);
  const [favorites, setFavorites] = useState<TranslationWithFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId] = useState<string>(() => {
    // Generate a simple user ID for demo purposes
    return `user_${Math.random().toString(36).substr(2, 9)}`;
  });

  const loadTranslations = useCallback(async () => {
    try {
      const result = await trpc.getTranslationHistory.query({ 
        user_id: userId,
        limit: 50,
        offset: 0 
      });
      setTranslations(result);
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }, [userId]);

  const loadFavorites = useCallback(async () => {
    try {
      const result = await trpc.getFavorites.query({ 
        user_id: userId,
        limit: 50,
        offset: 0 
      });
      setFavorites(result);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadTranslations();
    loadFavorites();
  }, [loadTranslations, loadFavorites]);

  const handleNewTranslation = useCallback((translation: Translation) => {
    const translationWithFavorite: TranslationWithFavorite = {
      ...translation,
      is_favorite: false
    };
    setTranslations((prev: TranslationWithFavorite[]) => [translationWithFavorite, ...prev]);
  }, []);

  const handleToggleFavorite = useCallback(async (translationId: number, isFavorite: boolean) => {
    setIsLoading(true);
    try {
      if (isFavorite) {
        await trpc.createFavorite.mutate({ 
          translation_id: translationId, 
          user_id: userId 
        });
      } else {
        await trpc.deleteFavorite.mutate({ 
          translation_id: translationId, 
          user_id: userId 
        });
      }
      
      // Update local state
      setTranslations((prev: TranslationWithFavorite[]) => 
        prev.map((t: TranslationWithFavorite) => 
          t.id === translationId ? { ...t, is_favorite: isFavorite } : t
        )
      );
      
      // Reload favorites list
      await loadFavorites();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, loadFavorites]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🌍 智能翻译助手
          </h1>
          <p className="text-lg text-gray-600">
            Smart Translation Assistant
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              中文 ↔ English
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              🎵 语音播放
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              ⭐ 收藏功能
            </Badge>
          </div>
        </div>

        {/* Main Translation Interface */}
        <Card className="mb-8 p-6 shadow-xl bg-white/80 backdrop-blur-sm border-0">
          <TranslationForm 
            userId={userId} 
            onTranslationCreated={handleNewTranslation}
          />
        </Card>

        {/* Tabs for History and Favorites */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="history" className="flex items-center gap-2">
              📚 翻译历史 / History
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              ⭐ 我的收藏 / Favorites
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="mt-6">
            <Card className="p-6 shadow-lg bg-white/80 backdrop-blur-sm border-0">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">
                📚 翻译历史
              </h2>
              <TranslationHistory 
                translations={translations}
                onToggleFavorite={handleToggleFavorite}
                isLoading={isLoading}
              />
            </Card>
          </TabsContent>
          
          <TabsContent value="favorites" className="mt-6">
            <Card className="p-6 shadow-lg bg-white/80 backdrop-blur-sm border-0">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">
                ⭐ 我的收藏
              </h2>
              <FavoritesList 
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                isLoading={isLoading}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;