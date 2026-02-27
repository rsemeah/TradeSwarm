import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#ffffff",
        card: {
          DEFAULT: "#141414",
          foreground: "#ffffff",
        },
        border: "#1f1f1f",
        muted: {
          DEFAULT: "#141414",
          foreground: "#6b6b6b",
        },
        accent: {
          green: "#00ff88",
          yellow: "#ffcc00",
          red: "#ff4444",
        },
        primary: {
          DEFAULT: "#00ff88",
          foreground: "#0a0a0a",
        },
        secondary: {
          DEFAULT: "#6b6b6b",
          foreground: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        card: "8px",
        badge: "4px",
      },
    },
  },
  plugins: [],
}

export default config
