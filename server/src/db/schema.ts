import { serial, text, pgTable, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define language enum
export const languageEnum = pgEnum('language', ['zh', 'en']);

// Translations table
export const translationsTable = pgTable('translations', {
  id: serial('id').primaryKey(),
  source_text: text('source_text').notNull(),
  translated_text: text('translated_text').notNull(),
  source_language: languageEnum('source_language').notNull(),
  target_language: languageEnum('target_language').notNull(),
  user_id: text('user_id'), // Nullable for anonymous users
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Favorite translations table
export const favoriteTranslationsTable = pgTable('favorite_translations', {
  id: serial('id').primaryKey(),
  translation_id: serial('translation_id').references(() => translationsTable.id).notNull(),
  user_id: text('user_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const translationsRelations = relations(translationsTable, ({ many }) => ({
  favorites: many(favoriteTranslationsTable),
}));

export const favoriteTranslationsRelations = relations(favoriteTranslationsTable, ({ one }) => ({
  translation: one(translationsTable, {
    fields: [favoriteTranslationsTable.translation_id],
    references: [translationsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Translation = typeof translationsTable.$inferSelect;
export type NewTranslation = typeof translationsTable.$inferInsert;
export type FavoriteTranslation = typeof favoriteTranslationsTable.$inferSelect;
export type NewFavoriteTranslation = typeof favoriteTranslationsTable.$inferInsert;

// Export all tables for proper query building
export const tables = { 
  translations: translationsTable,
  favoriteTranslations: favoriteTranslationsTable
};