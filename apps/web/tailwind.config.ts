import type { Config } from "tailwindcss";

const config: Config = {
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
        "status-draft": "#6B7280", // Gray
        "status-processing": "#3B82F6", // Blue
        "status-selesai": "#10B981", // Green
        "status-menunggu-approval": "#F59E0B", // Amber/Yellow
        "status-approved": "#047857", // Dark Green
        "status-butuh-revisi": "#EF4444", // Red
      },
      spacing: {
        "sidebar-width": "220px",
        "ai-panel-width": "360px",
      },
    },
  },
  plugins: [],
};
export default config;
