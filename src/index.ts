#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  createBambuCliServer,
  registerBambuCliTools,
} from "./bambu-cli-mcp/server.js";
import {
  createCadGeometryServer,
  registerCadGeometryTools,
} from "./cad-geometry-mcp/server.js";

export type ServerMode = "bambu" | "geometry" | "both";

function normalizeServerMode(value: string | undefined): ServerMode {
  if (value === "geometry" || value === "both" || value === "bambu") {
    return value;
  }
  return "bambu";
}

export function createCombinedServer(): McpServer {
  const server = new McpServer({
    name: "bambu-cli-mcp-combined",
    version: "0.1.0",
  });

  registerBambuCliTools(server);
  registerCadGeometryTools(server);

  return server;
}

export function createServerForMode(mode: ServerMode = "bambu"): McpServer {
  switch (mode) {
    case "geometry":
      return createCadGeometryServer();
    case "both":
      return createCombinedServer();
    case "bambu":
      return createBambuCliServer();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const serverFlag = args.find((a, i) => args[i - 1] === "--server");
  const server = createServerForMode(normalizeServerMode(serverFlag));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const entrypoint = process.argv[1] ? realpathSync(resolve(process.argv[1])) : "";
if (entrypoint === realpathSync(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
