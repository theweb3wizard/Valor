import { pgTable, uuid, text, numeric, timestamp } from 'drizzle-orm/pg-core';
import { communities } from './communities';

export const withdrawals = pgTable('withdrawals', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  telegramUserId: text('telegram_user_id').notNull(),
  destinationAddress: text('destination_address').notNull(),
  amount: numeric('amount').notNull(),
  txHash: text('tx_hash'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
