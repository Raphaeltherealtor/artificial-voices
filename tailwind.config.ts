import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {} },
  plugins: [
    function ({ addUtilities }: { addUtilities: (u: Record<string, Record<string, string>>) => void }) {
      addUtilities({ ".scrollbar-hide": { "-ms-overflow-style": "none", "scrollbar-width": "none" }, ".scrollbar-hide::-webkit-scrollbar": { display: "none" } });
    },
  ],
};

export default config;
