import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // These packages use native Node.js addons (.node binaries) that cannot
  // be bundled by webpack. Marking them as external tells Next.js to leave
  // them for the Node.js runtime instead of trying to bundle them.

  serverExternalPackages: [
    'sodium-native',
    'sodium-universal',
    '@tetherto/wdk-wallet-evm',
    '@tetherto/wdk-wallet-evm-erc-4337',
    '@tetherto/wdk-wallet',
    'libsodium-wrappers',
  ],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;