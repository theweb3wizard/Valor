import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { communities } from './communities';

export const wallets = pgTable('wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  communityId: uuid('community_id').notNull().references(() => communities.id, { onDelete: 'cascade' }),
  telegramUserId: text('telegram_user_id').notNull(),
  username: text('username').notNull(),
  cdpWalletId: text('cdp_wallet_id').notNull(),
  walletAddress: text('wallet_address').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  uniqueCommunityUser: unique().on(table.communityId, table.telegramUserId),
}));
