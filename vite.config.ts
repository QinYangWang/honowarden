import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from '@tailwindcss/vite'
import path from "path"

export default defineConfig({
	plugins: [tailwindcss(), react(), cloudflare()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src/client"),
		},
	},
});
