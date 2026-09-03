import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  logLevel: "silent",
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false },
});

try {
  const { messages: ui } = await vite.ssrLoadModule("/lib/i18n/messages.ts");
  const { assertLocaleParity } = await vite.ssrLoadModule(
    "/lib/i18n/parity.ts",
  );
  assertLocaleParity(ui.en, ui.ru);
  process.stdout.write("English/Russian message key parity passed.\n");
} finally {
  await vite.close();
}
