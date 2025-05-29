import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import z from "zod";
import packageJson from "../package.json";
import { getPageContent } from "./client/helpers";
import { createPage, listDocs, listPages, updatePage } from "./client/sdk.gen";

export const server = new McpServer({
  name: "coda",
  version: packageJson.version,
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "coda_list_documents",
  "List or search available documents",
  {
    query: z.string().optional().describe("The query to search for documents by - optional"),
  },
  async ({ query }): Promise<CallToolResult> => {
    try {
      const resp = await listDocs({ query: { query }, throwOnError: true });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to list documents: ${error}` }], isError: true };
    }
  },
);

server.tool(
  "coda_list_pages",
  "List pages in the current document",
  {
    docId: z.string().describe("The ID of the document to list pages from"),
  },
  async ({ docId }): Promise<CallToolResult> => {
    try {
      const resp = await listPages({ path: { docId }, throwOnError: true });

      return {
        content: [{ type: "text", text: JSON.stringify(resp.data) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Failed to list pages: ${error}` }],
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
  async ({ docId, name, content }): Promise<CallToolResult> => {
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
        throwOnError: true,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(resp.data) }],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to create page: ${error}` }], isError: true };
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
  async ({ docId, pageIdOrName }): Promise<CallToolResult> => {
    try {
      const content = await getPageContent(docId, pageIdOrName);

      if (!content) {
        throw new Error("Unknown error has occurred");
      }

      return { content: [{ type: "text", text: content }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to get page content: ${error}` }], isError: true };
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
  async ({ docId, pageIdOrName, content }): Promise<CallToolResult> => {
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
        throwOnError: true,
      });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to replace page content: ${error}` }], isError: true };
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
  async ({ docId, pageIdOrName, content }): Promise<CallToolResult> => {
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
        throwOnError: true,
      });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to append page content: ${error}` }], isError: true };
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
  async ({ docId, pageIdOrName, newName }): Promise<CallToolResult> => {
    try {
      const pageContent = await getPageContent(docId, pageIdOrName);
      const createResp = await createPage({
        path: { docId },
        body: {
          name: newName,
          pageContent: { type: "canvas", canvasContent: { format: "markdown", content: pageContent } },
        },
        throwOnError: true,
      });

      return { content: [{ type: "text", text: JSON.stringify(createResp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to duplicate page: ${error}` }], isError: true };
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
  async ({ docId, pageIdOrName, newName }): Promise<CallToolResult> => {
    try {
      const resp = await updatePage({
        path: { docId, pageIdOrName },
        body: {
          name: newName,
        },
        throwOnError: true,
      });

      return { content: [{ type: "text", text: JSON.stringify(resp.data) }] };
    } catch (error) {
      return { content: [{ type: "text", text: `Failed to rename page: ${error}` }], isError: true };
    }
  },
);
