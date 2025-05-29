#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { client } from "./client/client.gen";
import { config } from "./config";
import { server } from "./server";

async function main() {
  // Initialize Axios Client
  client.setConfig({
    baseURL: "https://coda.io/apis/v1",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
  });

  // Initialize MCP Server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Coda MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
