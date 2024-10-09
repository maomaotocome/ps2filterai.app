/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  images: {
    domains: ["upcdn.io", "replicate.delivery", "replicate.com", "pbxt.replicate.delivery"],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval' 'inline-speculation-rules' https:; style-src 'self' 'unsafe-inline' https:; img-src * data: blob:; font-src 'self' data: https:; connect-src 'self' https: wss: api.replicate.com; worker-src 'self' blob:; frame-src 'self' https:; media-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;",
          },
        ],
      },
    ];
  },
  serverRuntimeConfig: {
    // Will only be available on the server side
    mySecret: 'secret',
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: '/static',
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'onnxruntime-node'],
  },
  webpack(config) {
    config.experiments = { ...config.experiments, topLevelAwait: true };
    return config;
  },
};
