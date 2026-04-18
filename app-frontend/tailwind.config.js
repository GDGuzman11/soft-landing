/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#FAF8F5',
        surface: '#FFFFFF',
        'text-primary': '#1A1A1A',
        'text-secondary': '#6B6B6B',
        accent: '#C4956A',
        border: '#E8E3DC',
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
