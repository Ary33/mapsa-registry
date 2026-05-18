import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        mapsa: {
          bg: "var(--mapsa-bg)",
          panel: "var(--mapsa-panel)",
          "panel-alt": "var(--mapsa-panel-alt)",
          border: "var(--mapsa-border)",
          gold: "var(--mapsa-gold)",
          "gold-light": "var(--mapsa-gold-light)",
          muted: "var(--mapsa-muted)",
          text: "var(--mapsa-text)",
          accent: "var(--mapsa-accent)",
          red: "var(--mapsa-red)",
          input: "var(--mapsa-input-bg)",
          hover: "var(--mapsa-hover)",
        },
      },
      fontFamily: {
        cinzel: ["Cinzel", "serif"],
        garamond: ["EB Garamond", "Georgia", "serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      fontSize: {
        "2xs": "0.625rem",
      },
    },
  },
  plugins: [],
};

export default config;
