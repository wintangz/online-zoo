/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@online-zoo/game-core',
    '@online-zoo/game-assets',
    '@online-zoo/game-client',
    '@online-zoo/ui',
    'three',
    '@react-three/fiber',
    '@react-three/drei',
    '@react-three/rapier'
  ],
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true
    };
    return config;
  }
};

export default nextConfig;

