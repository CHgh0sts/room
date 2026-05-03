import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0b0d",
          soft: "#15151a",
          panel: "#1c1c22",
        },
        border: {
          DEFAULT: "#2a2a32",
          soft: "#23232a",
        },
        text: {
          DEFAULT: "#e7e7ea",
          muted: "#9a9aa3",
          dim: "#6c6c75",
        },
        accent: {
          DEFAULT: "#7c8cff",
          soft: "#3a3f66",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
