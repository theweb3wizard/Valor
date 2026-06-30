import { pgTable, uuid, text, integer, timestamp, date, unique } from 'drizzle-orm/pg-core';
import { communities } from './communities';

export const rateLimits = pgTable('rate_limits', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  telegramUserId: text('telegram_user_id').notNull(),
  tipsToday: integer('tips_today').notNull().default(0),
  lastTipAt: timestamp('last_tip_at', { withTimezone: true }),
  date: date('date').notNull().defaultNow(),
}, (table) => ({
  uniqueCommunityUserDate: unique().on(table.communityId, table.telegramUserId, table.date),
}));
