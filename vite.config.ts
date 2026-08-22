import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig(() => {
  const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];

  return {
    base: repository ? `/${repository}/` : "/",
    plugins: [react()],
    server: process.env.CODEX_SANDBOX === "seatbelt"
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
  };
});
