import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import next from "next";
import { WebSocketServer } from "ws";

import { initializeDatabase } from "./src/lib/db.js";
import { registerRealtimeServer } from "./src/lib/realtime.js";

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const isProduction =
  process.argv.includes("--production") || process.env.NODE_ENV === "production";
const app = next({
  dev: !isProduction,
  hostname: "0.0.0.0",
  port,
});
const handle = app.getRequestHandler();

async function bootstrap() {
  await initializeDatabase();
  await app.prepare();

  const server = createServer((request, response) => {
    handle(request, response);
  });

  const wss = new WebSocketServer({ noServer: true });
  registerRealtimeServer(wss);

  server.on("upgrade", (request, socket, head) => {
    if (request.url?.startsWith("/ws")) {
      wss.handleUpgrade(request, socket, head, (client) => {
        wss.emit("connection", client, request);
      });
      return;
    }

    socket.destroy();
  });

  server.listen(port, () => {
    console.log(`OMEGA FIT running on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start OMEGA FIT", error);
  process.exit(1);
});
