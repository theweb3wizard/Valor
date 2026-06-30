// Client-side configuration (NEXT_PUBLIC_* variables only)
// This file should only be imported on the client side

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

export const clientConfig = {
  appUrl: warnEnv('NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL),
};
