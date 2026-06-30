import { pgTable, uuid, text, integer, numeric, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { plans } from './plans';

export const communities = pgTable('communities', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerUserId: text('owner_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  planId: text('plan_id').references(() => plans.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  telegramChatId: text('telegram_chat_id').notNull().unique(),
  botToken: text('bot_token').notNull().unique(),
  tipAmountLow: numeric('tip_amount_low').notNull().default('1'),
  tipAmountHigh: numeric('tip_amount_high').notNull().default('2'),
  dailyLimitPerUser: integer('daily_limit_per_user').notNull().default(3),
  minScore: integer('min_score').notNull().default(7),
  treasuryWalletId: text('treasury_wallet_id'),
  treasuryAddress: text('treasury_address'),
  usdcBalance: numeric('usdc_balance').notNull().default('0'),
  evalContext: text('eval_context').default(''),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
