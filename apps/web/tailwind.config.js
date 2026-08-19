/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // UI/UX 规范 §3.1 设计令牌
      colors: {
        gold: "#B08D57",
        "gold-soft": "#C9A875",
        ink: "#1A1714",
        sand: "#FAF8F5",
        line: "#E7E1D8",
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
      },
      maxWidth: {
        "7xl": "80rem",
      },
    },
  },
  plugins: [],
};
