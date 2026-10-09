import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const withOpacity = (variableNameRGB: string) => {
  return ({ opacityValue }: { opacityValue?: string }) => {
    if (opacityValue !== undefined) {
      return `rgba(var(${variableNameRGB}), ${opacityValue})`;
    }
    return `rgb(var(${variableNameRGB}))`;
  };
};

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background:   "var(--background)",
        surface:      "var(--surface)",
        surfaceHover: "var(--surface-hover)",
        border:       "var(--border)",

        primary:      withOpacity("--primary-rgb") as any,
        primaryHover: "var(--primary-hover)",
        accent:       withOpacity("--cyan-rgb") as any,

        textPrimary:  "var(--text-primary)",
        textMuted:    "var(--text-muted)",
        ink:          "var(--ink)",

        violet:    "#ff6b5e",
        fuchsia:   "#ff8a7d",
        // Keep a flat DEFAULT (used as `text-amber`, `bg-rose/10`, ...) AND restore
        // the full Tailwind shade scale so `amber-400`, `emerald-500`, `rose-400`
        // etc. resolve instead of rendering colorless. Both forms are used widely.
        rose:      { ...colors.rose, DEFAULT: "#f43f5e" },
        amber:     { ...colors.amber, DEFAULT: "#f59e0b" },
        emerald:   { ...colors.emerald, DEFAULT: "#10b981" },
        cyan:      withOpacity("--cyan-rgb") as any,
        sky:       "#ffb454",
        matcha:    withOpacity("--matcha-rgb") as any,
        vermilion: withOpacity("--vermilion-rgb") as any,
        gold:      "#f59e0b",

        success: withOpacity("--matcha-rgb") as any,
        warning: withOpacity("--amber-rgb") as any,
        danger:  withOpacity("--vermilion-rgb") as any,
        info:    "#ffb454",
      },
      fontFamily: {
        sans:    ["Inter", "Plus Jakarta Sans", "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Meiryo", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "Noto Sans JP", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      animation: {
        "fade-in":     "fadeIn 0.4s ease-out",
        "slide-up":    "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in":    "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "bounce-slow": "bounce 3s infinite",
        "float":       "float 6s ease-in-out infinite",
        "pulse-glow":  "pulseGlow 2s ease-in-out infinite alternate",
        "shimmer":     "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":       { transform: "translateY(-10px)" },
        },
        pulseGlow: {
          "0%":   { boxShadow: "0 0 10px rgba(255,107,94,0.2)" },
          "100%": { boxShadow: "0 0 25px rgba(255,107,94,0.5)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      boxShadow: {
        "glass":        "0 8px 32px rgba(0, 0, 0, 0.28)",
        "glow-sm":      "0 0 12px rgba(255,107,94,0.22)",
        "glow-md":      "0 0 24px rgba(255,107,94,0.28)",
        "glow-lg":      "0 0 40px rgba(255,107,94,0.30)",
        "glow-indigo":  "0 0 20px rgba(255,107,94,0.30)",
        "glow-cyan":    "0 0 20px rgba(255,180,84,0.24)",
        "glow-emerald": "0 0 20px rgba(16,185,129,0.26)",
        "glow-rose":    "0 0 20px rgba(244,63,94,0.24)",
        "card":         "0 4px 24px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15)",
        "card-lg":      "0 8px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.20)",
        "card-vibrant": "0 10px 40px -10px rgba(0,0,0,0.45), 0 1px 1px rgba(255,255,255,0.05) inset",
      },
      backgroundImage: {
        "glass-gradient": "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))",
        "brand-gradient": "linear-gradient(to right, #ff8266, #ffb454)",
        "aurora": "radial-gradient(at 0% 0%, rgba(255, 107, 94, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(255, 138, 125, 0.15) 0px, transparent 50%)",
      },
    },
  },
  plugins: [],
};

export default config;
