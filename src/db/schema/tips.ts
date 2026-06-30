import { pgTable, uuid, text, integer, numeric, timestamp } from 'drizzle-orm/pg-core';
import { communities } from './communities';
import { evaluations } from './evaluations';

export const tips = pgTable('tips', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  evaluationId: uuid('evaluation_id').references(() => evaluations.id),
  telegramUserId: text('telegram_user_id').notNull(),
  username: text('username').notNull(),
  amount: numeric('amount').notNull(),
  walletAddress: text('wallet_address'),
  cdpTransferId: text('cdp_transfer_id'),
  txHash: text('tx_hash'),
  transactionStatus: text('transaction_status').notNull().default('pending'),
  failureReason: text('failure_reason'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  tippedAt: timestamp('tipped_at', { withTimezone: true }).defaultNow(),
});
