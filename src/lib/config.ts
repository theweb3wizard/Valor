function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Set this value in .env.local or your Vercel environment variables.`
    );
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue;
}

export const serverConfig = {
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  geminiApiKey: optionalEnv('GEMINI_API_KEY'),
  cdpApiKeyName: optionalEnv('CDP_API_KEY_NAME'),
  cdpApiKeyPrivateKey: optionalEnv('CDP_API_KEY_PRIVATE_KEY'),
  cdpNetworkId: optionalEnv('CDP_NETWORK_ID', 'base'),
  qstashToken: optionalEnv('QSTASH_TOKEN'),
  qstashCurrentSigningKey: optionalEnv('QSTASH_CURRENT_SIGNING_KEY'),
  qstashNextSigningKey: optionalEnv('QSTASH_NEXT_SIGNING_KEY'),
  paddleApiKey: optionalEnv('PADDLE_API_KEY'),
  paddleWebhookSecret: optionalEnv('PADDLE_WEBHOOK_SECRET'),
  appUrl: requireEnv('NEXT_PUBLIC_APP_URL'),
  cronSecret: optionalEnv('CRON_SECRET'),
  hasCdpConfig: !!process.env['CDP_API_KEY_NAME'] && !!process.env['CDP_API_KEY_PRIVATE_KEY'],
  hasPaddleConfig: !!process.env['PADDLE_API_KEY'],
  hasQstashConfig: !!process.env['QSTASH_TOKEN'] && !!process.env['QSTASH_CURRENT_SIGNING_KEY'],
  hasCronSecret: !!process.env['CRON_SECRET'],
};

export const clientConfig = {
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  paddleClientToken: optionalEnv('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN'),
  paddleEnvironment: optionalEnv('NEXT_PUBLIC_PADDLE_ENVIRONMENT', 'sandbox'),
  appUrl: requireEnv('NEXT_PUBLIC_APP_URL'),
};
