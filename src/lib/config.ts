const warnEnv = (name: string, value?: string): string => {
  if (!value || value.trim() === '') {
    if (typeof console !== 'undefined') {
      console.warn(`Missing environment variable: ${name}. Some features may not work.`);
    }
    return '';
  }
  return value;
};

const optionalEnv = (name: string, defaultValue: string = ''): string => {
  return process.env[name] || defaultValue;
};

// Server-side config (only available in server code)
export const serverConfig = {
  supabaseUrl: warnEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: warnEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceRoleKey: warnEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
  geminiApiKey: optionalEnv('GEMINI_API_KEY'),
  cdpApiKeyName: optionalEnv('CDP_API_KEY_NAME'),
  cdpApiKeyPrivateKey: optionalEnv('CDP_API_KEY_PRIVATE_KEY'),
  cdpNetworkId: optionalEnv('CDP_NETWORK_ID', 'base'),
  qstashToken: optionalEnv('QSTASH_TOKEN'),
  qstashCurrentSigningKey: optionalEnv('QSTASH_CURRENT_SIGNING_KEY'),
  qstashNextSigningKey: optionalEnv('QSTASH_NEXT_SIGNING_KEY'),
  paddleApiKey: optionalEnv('PADDLE_API_KEY'),
  paddleWebhookSecret: optionalEnv('PADDLE_WEBHOOK_SECRET'),
  appUrl: warnEnv('NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL),
  cronSecret: optionalEnv('CRON_SECRET'),
  hasSupabaseConfig: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  hasGeminiConfig: !!process.env.GEMINI_API_KEY,
  hasCdpConfig: !!process.env.CDP_API_KEY_NAME && !!process.env.CDP_API_KEY_PRIVATE_KEY,
  hasPaddleConfig: !!process.env.PADDLE_API_KEY,
  hasQstashConfig: !!process.env.QSTASH_TOKEN && !!process.env.QSTASH_CURRENT_SIGNING_KEY,
  hasCronSecret: !!process.env.CRON_SECRET,
  hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
};
