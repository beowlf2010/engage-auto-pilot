
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "Montserrat", "ui-sans-serif", "system-ui"],
        display: ["Montserrat", "Inter", "ui-sans-serif", "system-ui"],
      },
      colors: {
        "gradient-start": "#2d1c5a",
        "gradient-end": "#0d0628",
        accent: "#3ee6ff",
        accent2: "#712aff",
        "bg-glass": "rgba(255,255,255,0.08)",
        "button-accent": "#2aeae0",
        "button-dark": "#2d2177",
      },
      boxShadow: {
        "glass": "0 8px 40px 0 rgba(86,34,221,0.10)",
        "cta": "0 2px 16px 0 #2aeae099, 0 1.5px 14px 0 #3ee6ff40"
      },
      borderRadius: {
        xl: "1.25rem",
        "2xl": "2rem",
      },
      backgroundImage: {
        "purple-radial": "radial-gradient(ellipse at 80% 10%, #7157e6 0%, #2d1c5a 100%)",
        "purple-diag": "linear-gradient(123deg, #4124aa 0%, #0d0628 70%)",
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
