import type { Config } from 'tailwindcss';
import zooTailwindPreset from '@online-zoo/config/tailwind.preset';

const config: Config = {
  presets: [zooTailwindPreset],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/game-client/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {}
  },
  plugins: []
};

export default config;
