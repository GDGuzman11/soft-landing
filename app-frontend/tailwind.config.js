/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#FAF8F5',
          dark: '#1A1714',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#252118',
        },
        'text-primary': {
          DEFAULT: '#1A1A1A',
          dark: '#F0EDE8',
        },
        'text-secondary': {
          DEFAULT: '#6B6B6B',
          dark: '#9E9890',
        },
        accent: '#C4956A',
        border: {
          DEFAULT: '#E8E3DC',
          dark: '#333027',
        },
        error: '#E57373',
        'emotion-stressed': '#E8A598',
        'emotion-tired': '#C5B8D4',
        'emotion-sad': '#B0BEC5',
        'emotion-neutral': '#D4C5B0',
        'emotion-good': '#A8C5A0',
      },
      fontFamily: {
        'dm-sans': ['DMSans_400Regular'],
        'dm-sans-medium': ['DMSans_500Medium'],
        'dm-sans-bold': ['DMSans_700Bold'],
        'lora': ['Lora_400Regular'],
        'lora-italic': ['Lora_400Regular_Italic'],
      },
    },
  },
  plugins: [],
}
