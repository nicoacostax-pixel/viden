/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "pino-pretty": false,
      "encoding": false,
    };
    // Stub MetaMask SDK — we only use the injected connector
    config.resolve.alias = {
      ...config.resolve.alias,
      "@metamask/sdk": false,
    };
    return config;
  },
};

module.exports = nextConfig;
