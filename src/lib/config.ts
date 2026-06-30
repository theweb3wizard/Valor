const PLACEHOLDER_PATTERNS = /^(your-|placeholder|changeme|v|value|true|false|0|1)$/i;

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.test(value.trim());
}

const warnEnv = (name: string, value?: string): string => {
  if (!value || value.trim() === '' || isPlaceholder(value)) {
    if (typeof console !== 'undefined') {
      console.warn(`Missing environment variable: ${name}. Some features may not work.`);
    }
    return '';
  }
  return value;
};

const optionalEnv = (name: string, defaultValue: string = ''): string => {
  const val = process.env[name];
  if (!val || isPlaceholder(val)) return defaultValue;
  return val;
};

// Server-side config (only available in server code)
export const serverConfig = {
  geminiApiKey: optionalEnv('GEMINI_API_KEY'),
  treasuryPrivateKey: optionalEnv('TREASURY_PRIVATE_KEY'),
  qstashToken: optionalEnv('QSTASH_TOKEN'),
  qstashCurrentSigningKey: optionalEnv('QSTASH_CURRENT_SIGNING_KEY'),
  qstashNextSigningKey: optionalEnv('QSTASH_NEXT_SIGNING_KEY'),
  databaseUrl: optionalEnv('DATABASE_URL'),
  authSecret: optionalEnv('AUTH_SECRET'),
  appUrl: warnEnv('NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL),
  cronSecret: optionalEnv('CRON_SECRET'),
  hasDatabaseConfig: !!process.env.DATABASE_URL,
  hasGeminiConfig: !!process.env.GEMINI_API_KEY,
  hasTreasuryConfig: !!process.env.TREASURY_PRIVATE_KEY,
  hasQstashConfig: !!process.env.QSTASH_TOKEN && !!process.env.QSTASH_CURRENT_SIGNING_KEY,
  hasCronSecret: !!process.env.CRON_SECRET,
  hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
};
