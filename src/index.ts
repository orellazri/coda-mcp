#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import packageJson from "../package.json";
import { listPages } from "./client";
import { client } from "./client/client.gen";
import { getPageContent } from "./client/helpers";
import { createPage, listDocs, updatePage } from "./client/sdk.gen";
import { config } from "./config";

const server = new McpServer({
  name: "coda",
  version: packageJson.version,
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool("coda_list_documents", "List available documents", async () => {
  try {
    const resp = await listDocs();
    return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
  } catch {
    return { content: [{ type: "text", text: "Failed to list documents" }], isError: true };
  }
});

server.tool(
  "coda_list_pages",
  "List pages in the current document",
  {
    docId: z.string().describe("The ID of the document to list pages from"),
  },
  async ({ docId }) => {
    try {
      const resp = await listPages({ path: { docId } });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data) }],
      };
    } catch {
      return {
        content: [{ type: "text", text: "Failed to list pages" }],
        isError: true,
      };
    }
  },
);

server.tool(
  "coda_create_page",
  "Create a page in the current document",
  {
    docId: z.string().describe("The ID of the document to create the page in"),
    name: z.string().describe("The name of the page to create"),
    content: z.string().optional().describe("The markdown content of the page to create - optional"),
  },
  async ({ docId, name, content }) => {
    try {
      const resp = await createPage({
        path: { docId },
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
  "coda_get_page_content",
  "Get the content of a page as markdown",
  {
    docId: z.string().describe("The ID of the document that contains the page to get the content of"),
    pageIdOrName: z.string().describe("The ID or name of the page to get the content of"),
  },
  async ({ docId, pageIdOrName }) => {
    try {
      const content = await getPageContent(docId, pageIdOrName);
      return { content: [{ type: "text", text: content }] };
    } catch {
      return { content: [{ type: "text", text: "Failed to get page content" }], isError: true };
    }
  },
);

server.tool(
  "coda_replace_page_content",
  "Replace the content of a page with new markdown content",
  {
    docId: z.string().describe("The ID of the document that contains the page to replace the content of"),
    pageIdOrName: z.string().describe("The ID or name of the page to replace the content of"),
    content: z.string().describe("The markdown content to replace the page with"),
  },
  async ({ docId, pageIdOrName, content }) => {
    try {
      const resp = await updatePage({
        path: {
          docId,
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
  "coda_append_page_content",
  "Append new markdown content to the end of a page",
  {
    docId: z.string().describe("The ID of the document that contains the page to append the content to"),
    pageIdOrName: z.string().describe("The ID or name of the page to append the content to"),
    content: z.string().describe("The markdown content to append to the page"),
  },
  async ({ docId, pageIdOrName, content }) => {
    try {
      const resp = await updatePage({
        path: {
          docId,
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
  "coda_duplicate_page",
  "Duplicate a page in the current document",
  {
    docId: z.string().describe("The ID of the document that contains the page to duplicate"),
    pageIdOrName: z.string().describe("The ID or name of the page to duplicate"),
    newName: z.string().describe("The name of the new page"),
  },
  async ({ docId, pageIdOrName, newName }) => {
    try {
      const pageContent = await getPageContent(docId, pageIdOrName);
      const createResp = await createPage({
        path: { docId },
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
  "coda_rename_page",
  "Rename a page in the current document",
  {
    docId: z.string().describe("The ID of the document that contains the page to rename"),
    pageIdOrName: z.string().describe("The ID or name of the page to rename"),
    newName: z.string().describe("The new name of the page"),
  },
  async ({ docId, pageIdOrName, newName }) => {
    try {
      const resp = await updatePage({
        path: { docId, pageIdOrName },
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
