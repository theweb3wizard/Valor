export interface TelegramMessage {
  from?: {
    id?: number;
    is_bot?: boolean;
    username?: string;
  };
  text?: string;
  message_id?: number;
  reply_to_message?: {
    text?: string;
  };
  date?: number;
}

const cryptoKeywords = [
  'wallet', 'token', 'blockchain', 'contract', 'protocol', 'defi',
  'nft', 'gas', 'bridge', 'stake', 'yield', 'liquidity', 'chain',
  'transaction', 'address', 'seed', 'exchange', 'dex', 'cex',
  'rugpull', 'whitepaper', 'tokenomics', 'airdrop', 'mint', 'burn',
  'mempool', 'validator', 'slippage', 'smartcontract', 'dao', 'governance',
];

function stripEmojis(text: string): string {
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
}

export function passesFilterOne(message: TelegramMessage): boolean {
  if (!message.from || message.from.is_bot) return false;
  if (!message.text || message.text.trim().length === 0) return false;
  if (message.text.trim().startsWith('/')) return false;

  const cleaned = stripEmojis(message.text);
  const wordCount = cleaned.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 4) return false;

  return true;
}

export function passesFilterTwo(message: TelegramMessage): boolean {
  if (!message.text) return false;
  const text = message.text.toLowerCase();
  const cleaned = stripEmojis(text);
  const wordCount = cleaned.trim().split(/\s+/).filter(Boolean).length;

  const hasQuestionMark = text.includes('?');
  const hasSufficientWords = wordCount > 8;
  const hasCryptoKeyword = cryptoKeywords.some((kw) => text.includes(kw));

  if (!hasQuestionMark && !hasSufficientWords && !hasCryptoKeyword) return false;

  return true;
}

export function shouldEvaluate(message: TelegramMessage): boolean {
  return passesFilterOne(message) && passesFilterTwo(message);
}
