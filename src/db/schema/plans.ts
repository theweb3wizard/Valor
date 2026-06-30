import { pgTable, uuid, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core';

export const plans = pgTable('plans', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  priceMonthly: numeric('price_monthly').notNull(),
  maxCommunities: integer('max_communities').notNull(),
  maxEvalsMonthly: integer('max_evals_monthly').notNull(),
  maxTipsMonthly: integer('max_tips_monthly').notNull(),
  paddlePriceId: text('paddle_price_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
