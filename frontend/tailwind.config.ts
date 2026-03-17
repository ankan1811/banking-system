import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./constants/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        fill: {
          1: "rgba(255, 255, 255, 0.10)",
        },
        bankGradient: "#8b5cf6",
        indigo: {
          500: "#6172F3",
          700: "#3538CD",
        },
        success: {
          25: "#0d1f17",
          50: "#0f2a1d",
          100: "#113322",
          600: "#34d399",
          700: "#6ee7b7",
          900: "#a7f3d0",
        },
        pink: {
          25: "#1a0f17",
          100: "#2d1527",
          500: "#EE46BC",
          600: "#DD2590",
          700: "#C11574",
          900: "#851651",
        },
        blue: {
          25: "rgba(139, 92, 246, 0.08)",
          100: "rgba(139, 92, 246, 0.15)",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          900: "#4c1d95",
        },
        sky: {
          1: "#0a0e1a",
        },
        black: {
          1: "#e2e8f0",
          2: "#cbd5e1",
        },
        gray: {
          25: "#0a0e1a",
          200: "rgba(100, 116, 139, 0.2)",
          300: "rgba(100, 116, 139, 0.3)",
          500: "#64748b",
          600: "#94a3b8",
          700: "#cbd5e1",
          900: "#f1f5f9",
        },
        surface: "#0f1629",
        "surface-light": "#1a2235",
      },
      backgroundImage: {
        "bank-gradient":
          "linear-gradient(135deg, #8b5cf6 0%, #6366f1 40%, #22d3ee 100%)",
        "gradient-mesh": "url('/icons/gradient-mesh.svg')",
        "bank-green-gradient":
          "linear-gradient(135deg, #059669 0%, #34d399 100%)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.3)",
        "glass-hover":
          "0 16px 48px rgba(139, 92, 246, 0.12), 0 8px 24px rgba(0, 0, 0, 0.3)",
        "glow-violet": "0 0 24px rgba(139, 92, 246, 0.25)",
        "glow-cyan": "0 0 24px rgba(34, 211, 238, 0.25)",
        "card-3d":
          "0 20px 60px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.3)",
        form: "0px 1px 2px 0px rgba(0, 0, 0, 0.3), 0px 0px 12px 0px rgba(139, 92, 246, 0.15)",
        chart:
          "0px 1px 3px 0px rgba(0, 0, 0, 0.3), 0px 0px 20px 0px rgba(139, 92, 246, 0.08)",
        profile:
          "0px 12px 16px -4px rgba(0, 0, 0, 0.4), 0px 0px 24px 0px rgba(139, 92, 246, 0.12)",
        creditCard:
          "0px 8px 32px 0px rgba(0, 0, 0, 0.4), 0px 0px 20px 0px rgba(139, 92, 246, 0.15)",
      },
      fontFamily: {
        inter: "var(--font-inter)",
        "ibm-plex-serif": "var(--font-ibm-plex-serif)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        shimmer: "shimmer 2.5s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
