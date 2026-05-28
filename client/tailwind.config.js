/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        agri: {
          green: {
            DEFAULT: "#2E7D32",
            light: "#66BB6A",
            dark: "#1B5E20",
            hover: "#256428",
            50: "#E8F5E9",
            100: "#C8E6C9",
            500: "#2E7D32",
            900: "#1B5E20",
          },
          wheat: {
            DEFAULT: "#F9A825",
            light: "#FBC02D",
            dark: "#F57F17",
          },
          cream: {
            DEFAULT: "#FAF7F2",
            dark: "#F4EFE6",
          },
          brown: {
            DEFAULT: "#8D6E63",
            light: "#A1887F",
            dark: "#5D4037",
          }
        }
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 4s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(102, 187, 106, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(102, 187, 106, 0.6)" },
        }
      }
    },
  },
  plugins: [],
};

