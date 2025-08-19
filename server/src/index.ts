import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createTranslationInputSchema,
  createFavoriteInputSchema,
  deleteFavoriteInputSchema,
  getTranslationHistoryInputSchema,
  getFavoritesInputSchema
} from './schema';

// Import handlers
import { createTranslation } from './handlers/create_translation';
import { getTranslationHistory } from './handlers/get_translation_history';
import { createFavorite } from './handlers/create_favorite';
import { deleteFavorite } from './handlers/delete_favorite';
import { getFavorites } from './handlers/get_favorites';
import { getTranslationById } from './handlers/get_translation_by_id';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Translation endpoints
  createTranslation: publicProcedure
    .input(createTranslationInputSchema)
    .mutation(({ input }) => createTranslation(input)),

  getTranslationHistory: publicProcedure
    .input(getTranslationHistoryInputSchema)
    .query(({ input }) => getTranslationHistory(input)),

  getTranslationById: publicProcedure
    .input(z.object({
      id: z.number(),
      userId: z.string().nullable().optional()
    }))
    .query(({ input }) => getTranslationById(input.id, input.userId ?? undefined)),

  // Favorite endpoints
  createFavorite: publicProcedure
    .input(createFavoriteInputSchema)
    .mutation(({ input }) => createFavorite(input)),

  deleteFavorite: publicProcedure
    .input(deleteFavoriteInputSchema)
    .mutation(({ input }) => deleteFavorite(input)),

  getFavorites: publicProcedure
    .input(getFavoritesInputSchema)
    .query(({ input }) => getFavorites(input)),

  // Language detection endpoint (for real-time translation)
  detectLanguage: publicProcedure
    .input(z.object({
      text: z.string().min(1)
    }))
    .query(({ input }) => {
      // This is a placeholder for language detection
      // In real implementation, this would use a language detection service
      const hasChineseCharacters = /[\u4e00-\u9fff]/.test(input.text);
      return {
        detectedLanguage: hasChineseCharacters ? 'zh' : 'en',
        confidence: 0.95
      };
    }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Translation API server listening at port: ${port}`);
  console.log('Available endpoints:');
  console.log('- POST /createTranslation - Create a new translation');
  console.log('- GET /getTranslationHistory - Get translation history');
  console.log('- GET /getTranslationById - Get specific translation');
  console.log('- POST /createFavorite - Add translation to favorites');
  console.log('- POST /deleteFavorite - Remove translation from favorites');
  console.log('- GET /getFavorites - Get user favorites');
  console.log('- GET /detectLanguage - Detect text language');
}

start();