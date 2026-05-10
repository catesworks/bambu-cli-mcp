#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBambuCliServer } from "./bambu-cli-mcp/server.js";
import { createCadGeometryServer } from "./cad-geometry-mcp/server.js";

async function main() {
  const args = process.argv.slice(2);
  const serverFlag =
    args.find((a, i) => args[i - 1] === "--server") ?? "bambu";

  let server;

  switch (serverFlag) {
    case "geometry":
      server = createCadGeometryServer();
      break;
    case "bambu":
      server = createBambuCliServer();
      break;
    case "both":
    default:
      // For "both", we register all tools on a single server
      server = createBambuCliServer();
      // TODO: Merge both servers' tools into one when MCP SDK supports it
      // For now, run them separately with different --server flags
      break;
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
