import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'blue': {
          '400': '#60A5FA',
          '500': '#3B82F6',
          '600': '#2563EB',
        },
        'gray': {
          '100': '#F3F4F6',
          '300': '#D1D5DB',
          '700': '#374151',
          '800': '#1F2937',
        },
      },
      fontFamily: {
        serif: ['Palatino', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
