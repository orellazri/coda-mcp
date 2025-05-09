#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import packageJson from "../package.json";
import { listPages } from "./client";
import { client } from "./client/client.gen";
import { getPageContent } from "./client/helpers";
import { createPage, updatePage } from "./client/sdk.gen";
import { config } from "./config";

const server = new McpServer({
  name: "coda",
  version: packageJson.version,
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool("list-pages", "List pages in the current document", async () => {
  try {
    const resp = await listPages({ path: { docId: config.docId } });
    return {
      content: [{ type: "text", text: JSON.stringify(resp.data) }],
    };
  } catch {
    return {
      content: [{ type: "text", text: "Failed to list pages" }],
      isError: true,
    };
  }
});

server.tool(
  "create-page",
  "Create a page in the current document",
  {
    name: z.string().describe("The name of the page to create"),
    content: z.string().optional().describe("The markdown content of the page to create - optional"),
  },
  async ({ name, content }) => {
    try {
      const resp = await createPage({
        path: { docId: config.docId },
        body: {
          name,
          pageContent: {
            type: "canvas",
            canvasContent: { format: "markdown", content: content ?? " " },
          },
        },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data) }],
      };
    } catch {
      return { content: [{ type: "text", text: "Failed to create page" }], isError: true };
    }
  },
);

server.tool(
  "get-page-content",
  "Get the content of a page as markdown",
  {
    pageIdOrName: z.string().describe("The ID or name of the page to get the content of"),
  },
  async ({ pageIdOrName }) => {
    try {
      const content = await getPageContent(config.docId, pageIdOrName);
      return { content: [{ type: "text", text: content }] };
    } catch {
      return { content: [{ type: "text", text: "Failed to get page content" }], isError: true };
    }
  },
);

server.tool(
  "replace-page-content",
  "Replace the content of a page with new markdown content",
  {
    pageIdOrName: z.string().describe("The ID or name of the page to replace the content of"),
    content: z.string().describe("The markdown content to replace the page with"),
  },
  async ({ pageIdOrName, content }) => {
    try {
      const resp = await updatePage({
        path: {
          docId: config.docId,
          pageIdOrName,
        },
        body: {
          // @ts-expect-error auto-generated client types
          contentUpdate: {
            insertionMode: "replace",
            canvasContent: { format: "markdown", content },
          },
        },
      });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch {
      return { content: [{ type: "text", text: "Failed to replace page content" }], isError: true };
    }
  },
);

server.tool(
  "append-page-content",
  "Append new markdown content to the end of a page",
  {
    pageIdOrName: z.string().describe("The ID or name of the page to append the content to"),
    content: z.string().describe("The markdown content to append to the page"),
  },
  async ({ pageIdOrName, content }) => {
    try {
      const resp = await updatePage({
        path: {
          docId: config.docId,
          pageIdOrName,
        },
        body: {
          // @ts-expect-error auto-generated client types
          contentUpdate: {
            insertionMode: "append",
            canvasContent: { format: "markdown", content },
          },
        },
      });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch {
      return { content: [{ type: "text", text: "Failed to append page content" }], isError: true };
    }
  },
);

server.tool(
  "duplicate-page",
  "Duplicate a page in the current document",
  {
    pageIdOrName: z.string().describe("The ID or name of the page to duplicate"),
    newName: z.string().describe("The name of the new page"),
  },
  async ({ pageIdOrName, newName }) => {
    try {
      const pageContent = await getPageContent(config.docId, pageIdOrName);
      const createResp = await createPage({
        path: { docId: config.docId },
        body: {
          name: newName,
          pageContent: { type: "canvas", canvasContent: { format: "markdown", content: pageContent } },
        },
      });
      return { content: [{ type: "text", text: JSON.stringify(createResp.data) }] };
    } catch {
      return { content: [{ type: "text", text: "Failed to duplicate page" }], isError: true };
    }
  },
);

server.tool(
  "rename-page",
  "Rename a page in the current document",
  {
    pageIdOrName: z.string().describe("The ID or name of the page to rename"),
    newName: z.string().describe("The new name of the page"),
  },
  async ({ pageIdOrName, newName }) => {
    try {
      const resp = await updatePage({
        path: { docId: config.docId, pageIdOrName },
        body: {
          name: newName,
        },
      });
      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch {
      return { content: [{ type: "text", text: "Failed to rename page" }], isError: true };
    }
  },
);

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
