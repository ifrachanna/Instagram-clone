import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        instagram: {
          pink: '#E1306C',
          purple: '#C13584',
          yellow: '#FCAF45',
          orange: '#F77737',
          blue: '#0095F6',
          darkBg: '#000000',
          secondaryDark: '#121212',
          borderDark: '#262626',
          borderLight: '#DBDBDB',
        },
      },
    },
  },
  plugins: [],
};

export default config;
