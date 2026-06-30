import { pgTable, uuid, text, integer, boolean, timestamp, bigint } from 'drizzle-orm/pg-core';
import { communities } from './communities';

export const evaluations = pgTable('evaluations', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  telegramUserId: text('telegram_user_id').notNull(),
  username: text('username').notNull(),
  telegramMessageId: bigint('telegram_message_id', { mode: 'number' }).notNull(),
  messageContent: text('message_content').notNull(),
  score: integer('score').notNull(),
  reason: text('reason').notNull(),
  shouldTip: boolean('should_tip').notNull().default(false),
  evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).defaultNow(),
});
