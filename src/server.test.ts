import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as helpers from "./helpers";
import * as sdk from "./client/sdk.gen";
import { server as mcpServer } from "./server";

vi.mock("./client/sdk.gen");
vi.mock("./helpers");
vi.mock("axios");

async function connect(server: typeof mcpServer.server) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  return {
    listTools: () => client.listTools(),
    callTool: (name: string, args: Record<string, unknown> = {}) => client.callTool({ name, arguments: args }),
  };
}

afterEach(async () => {
  await mcpServer.server.close();
  vi.clearAllMocks();
});

describe("MCP Server", () => {
  it("should have all tools", async () => {
    const client = await connect(mcpServer.server);
    const result = await client.listTools();
    expect(result.tools).toEqual([
      expect.objectContaining({ name: "coda_list_documents" }),
      expect.objectContaining({ name: "coda_list_pages" }),
      expect.objectContaining({ name: "coda_create_page" }),
      expect.objectContaining({ name: "coda_get_page_content" }),
      expect.objectContaining({ name: "coda_peek_page" }),
      expect.objectContaining({ name: "coda_replace_page_content" }),
      expect.objectContaining({ name: "coda_append_page_content" }),
      expect.objectContaining({ name: "coda_duplicate_page" }),
      expect.objectContaining({ name: "coda_rename_page" }),
      expect.objectContaining({ name: "coda_resolve_link" }),
      expect.objectContaining({ name: "coda_list_tables" }),
      expect.objectContaining({ name: "coda_list_columns" }),
      expect.objectContaining({ name: "coda_list_rows" }),
      expect.objectContaining({ name: "coda_get_row" }),
      expect.objectContaining({ name: "coda_upsert_rows" }),
      expect.objectContaining({ name: "coda_update_row" }),
      expect.objectContaining({ name: "coda_delete_row" }),
      expect.objectContaining({ name: "coda_delete_rows" }),
      expect.objectContaining({ name: "coda_push_button" }),
    ]);
  });
});

describe("coda_list_documents", () => {
  it("should list documents without query", async () => {
    vi.mocked(sdk.listDocs).mockResolvedValue({
      data: {
        items: [
          { id: "123", name: "Test Document" },
          { id: "456", name: "Another Document" },
        ],
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_documents", { query: "" });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          items: [
            { id: "123", name: "Test Document" },
            { id: "456", name: "Another Document" },
          ],
        }),
      },
    ]);
  });

  it("should list documents with query", async () => {
    vi.mocked(sdk.listDocs).mockResolvedValue({
      data: {
        items: [{ id: "123", name: "Test Document" }],
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_documents", { query: "test" });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          items: [{ id: "123", name: "Test Document" }],
        }),
      },
    ]);
  });

  it("should show error if list documents throws", async () => {
    vi.mocked(sdk.listDocs).mockRejectedValue(new Error("foo"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_documents", { query: "test" });
    expect(result.content).toEqual([{ type: "text", text: "Failed to list documents: Error: foo" }]);
  });
});

describe("coda_list_pages", () => {
  it("should list pages successfully without limit or nextPageToken", async () => {
    vi.mocked(sdk.listPages).mockResolvedValue({
      data: {
        items: [
          { id: "page-123", name: "Test Page 1" },
          { id: "page-456", name: "Test Page 2" },
        ],
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_pages", { docId: "doc-123" });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          items: [
            { id: "page-123", name: "Test Page 1" },
            { id: "page-456", name: "Test Page 2" },
          ],
        }),
      },
    ]);
    expect(sdk.listPages).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      query: { limit: undefined, pageToken: undefined },
      throwOnError: true,
    });
  });

  it("should list pages with limit", async () => {
    vi.mocked(sdk.listPages).mockResolvedValue({
      data: {
        items: [
          { id: "page-123", name: "Test Page 1" },
          { id: "page-456", name: "Test Page 2" },
        ],
        nextPageToken: "token-123",
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_pages", { docId: "doc-123", limit: 10 });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          items: [
            { id: "page-123", name: "Test Page 1" },
            { id: "page-456", name: "Test Page 2" },
          ],
          nextPageToken: "token-123",
        }),
      },
    ]);
    expect(sdk.listPages).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      query: { limit: 10, pageToken: undefined },
      throwOnError: true,
    });
  });

  it("should list pages with nextPageToken", async () => {
    vi.mocked(sdk.listPages).mockResolvedValue({
      data: {
        items: [
          { id: "page-789", name: "Test Page 3" },
          { id: "page-101", name: "Test Page 4" },
        ],
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_pages", {
      docId: "doc-123",
      nextPageToken: "token-123",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          items: [
            { id: "page-789", name: "Test Page 3" },
            { id: "page-101", name: "Test Page 4" },
          ],
        }),
      },
    ]);
    expect(sdk.listPages).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      query: { limit: undefined, pageToken: "token-123" },
      throwOnError: true,
    });
  });

  it("should prioritize nextPageToken over limit", async () => {
    vi.mocked(sdk.listPages).mockResolvedValue({
      data: {
        items: [{ id: "page-789", name: "Test Page 3" }],
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_pages", {
      docId: "doc-123",
      limit: 5,
      nextPageToken: "token-123",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          items: [{ id: "page-789", name: "Test Page 3" }],
        }),
      },
    ]);
    // When nextPageToken is provided, limit should be undefined
    expect(sdk.listPages).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      query: { limit: undefined, pageToken: "token-123" },
      throwOnError: true,
    });
  });

  it("should show error if list pages throws", async () => {
    vi.mocked(sdk.listPages).mockRejectedValue(new Error("Access denied"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_pages", { docId: "doc-123" });
    expect(result.content).toEqual([{ type: "text", text: "Failed to list pages: Error: Access denied" }]);
  });
});

describe("coda_create_page", () => {
  it("should create page with content", async () => {
    vi.mocked(sdk.createPage).mockResolvedValue({
      data: {
        id: "page-new",
        requestId: "req-123",
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_create_page", {
      docId: "doc-123",
      name: "New Page",
      content: "# Hello World",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          id: "page-new",
          requestId: "req-123",
        }),
      },
    ]);
    expect(sdk.createPage).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      body: {
        name: "New Page",
        pageContent: {
          type: "canvas",
          canvasContent: { format: "markdown", content: "# Hello World" },
        },
      },
      throwOnError: true,
    });
  });

  it("should create page without content", async () => {
    vi.mocked(sdk.createPage).mockResolvedValue({
      data: {
        id: "page-new",
        requestId: "req-124",
      },
    } as any);

    const client = await connect(mcpServer.server);
    await client.callTool("coda_create_page", {
      docId: "doc-123",
      name: "Empty Page",
    });
    expect(sdk.createPage).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      body: {
        name: "Empty Page",
        pageContent: {
          type: "canvas",
          canvasContent: { format: "markdown", content: " " },
        },
      },
      throwOnError: true,
    });
  });

  it("should create page with parent page id and content", async () => {
    vi.mocked(sdk.createPage).mockResolvedValue({
      data: {
        id: "page-sub",
        requestId: "req-125",
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_create_page", {
      docId: "doc-123",
      name: "Subpage",
      parentPageId: "page-456",
      content: "## Subheading",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({ id: "page-sub", requestId: "req-125" }),
      },
    ]);
    expect(sdk.createPage).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      body: {
        name: "Subpage",
        parentPageId: "page-456",
        pageContent: {
          type: "canvas",
          canvasContent: { format: "markdown", content: "## Subheading" },
        },
      },
      throwOnError: true,
    });
  });

  it("should show error if create page throws", async () => {
    vi.mocked(sdk.createPage).mockRejectedValue(new Error("Insufficient permissions"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_create_page", {
      docId: "doc-123",
      name: "New Page",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to create page: Error: Insufficient permissions" }]);
  });
});

describe("coda_get_page_content", () => {
  it("should get page content successfully", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue("# Page Title\n\nThis is the content.");

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_get_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: "# Page Title\n\nThis is the content.",
      },
    ]);
    expect(helpers.getPageContent).toHaveBeenCalledWith("doc-123", "page-456");
  });

  it("should handle empty page content", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue("");

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_get_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: "",
      },
    ]);
  });

  it("should show error if getPageContent returns undefined", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue(undefined as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_get_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
    });
    expect(result.content).toEqual([
      { type: "text", text: "Failed to get page content: Error: Unknown error has occurred" },
    ]);
  });

  it("should show error if getPageContent throws", async () => {
    vi.mocked(helpers.getPageContent).mockRejectedValue(new Error("Export failed"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_get_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to get page content: Error: Export failed" }]);
  });
});

describe("coda_peek_page", () => {
  it("should peek page content successfully", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue("# Title\nLine 1\nLine 2\nLine 3");

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_peek_page", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      numLines: 2,
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: "# Title\nLine 1",
      },
    ]);
    expect(helpers.getPageContent).toHaveBeenCalledWith("doc-123", "page-456");
  });

  it("should show error if getPageContent returns undefined", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue(undefined as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_peek_page", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      numLines: 1,
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to peek page: Error: Unknown error has occurred" }]);
  });

  it("should show error if getPageContent throws", async () => {
    vi.mocked(helpers.getPageContent).mockRejectedValue(new Error("Export failed"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_peek_page", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      numLines: 3,
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to peek page: Error: Export failed" }]);
  });
});

describe("coda_replace_page_content", () => {
  it("should replace page content successfully", async () => {
    vi.mocked(sdk.updatePage).mockResolvedValue({
      data: {
        id: "page-456",
        requestId: "req-125",
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_replace_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      content: "# New Content\n\nReplaced content.",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          id: "page-456",
          requestId: "req-125",
        }),
      },
    ]);
    expect(sdk.updatePage).toHaveBeenCalledWith({
      path: { docId: "doc-123", pageIdOrName: "page-456" },
      body: {
        contentUpdate: {
          insertionMode: "replace",
          canvasContent: { format: "markdown", content: "# New Content\n\nReplaced content." },
        },
      },
      throwOnError: true,
    });
  });

  it("should show error if replace page content throws", async () => {
    vi.mocked(sdk.updatePage).mockRejectedValue(new Error("Update failed"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_replace_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      content: "# New Content",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to replace page content: Error: Update failed" }]);
  });
});

describe("coda_append_page_content", () => {
  it("should append page content successfully", async () => {
    vi.mocked(sdk.updatePage).mockResolvedValue({
      data: {
        id: "page-456",
        requestId: "req-126",
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_append_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      content: "\n\n## Appended Section\n\nNew content.",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          id: "page-456",
          requestId: "req-126",
        }),
      },
    ]);
    expect(sdk.updatePage).toHaveBeenCalledWith({
      path: { docId: "doc-123", pageIdOrName: "page-456" },
      body: {
        contentUpdate: {
          insertionMode: "append",
          canvasContent: { format: "markdown", content: "\n\n## Appended Section\n\nNew content." },
        },
      },
      throwOnError: true,
    });
  });

  it("should show error if append page content throws", async () => {
    vi.mocked(sdk.updatePage).mockRejectedValue(new Error("Append failed"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_append_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      content: "Additional content",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to append page content: Error: Append failed" }]);
  });
});

describe("coda_duplicate_page", () => {
  it("should duplicate page successfully", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue("# Original Page\n\nOriginal content.");
    vi.mocked(sdk.createPage).mockResolvedValue({
      data: {
        id: "page-duplicate",
        requestId: "req-127",
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_duplicate_page", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      newName: "Duplicated Page",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          id: "page-duplicate",
          requestId: "req-127",
        }),
      },
    ]);
    expect(helpers.getPageContent).toHaveBeenCalledWith("doc-123", "page-456");
    expect(sdk.createPage).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      body: {
        name: "Duplicated Page",
        pageContent: {
          type: "canvas",
          canvasContent: { format: "markdown", content: "# Original Page\n\nOriginal content." },
        },
      },
      throwOnError: true,
    });
  });

  it("should show error if getPageContent fails during duplication", async () => {
    vi.mocked(helpers.getPageContent).mockRejectedValue(new Error("Content fetch failed"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_duplicate_page", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      newName: "Duplicated Page",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to duplicate page: Error: Content fetch failed" }]);
  });

  it("should show error if createPage fails during duplication", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue("# Original Page");
    vi.mocked(sdk.createPage).mockRejectedValue(new Error("Create failed"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_duplicate_page", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      newName: "Duplicated Page",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to duplicate page: Error: Create failed" }]);
  });
});

describe("coda_rename_page", () => {
  it("should rename page successfully", async () => {
    vi.mocked(sdk.updatePage).mockResolvedValue({
      data: {
        id: "page-456",
        requestId: "req-128",
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_rename_page", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      newName: "Renamed Page",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          id: "page-456",
          requestId: "req-128",
        }),
      },
    ]);
    expect(sdk.updatePage).toHaveBeenCalledWith({
      path: { docId: "doc-123", pageIdOrName: "page-456" },
      body: {
        name: "Renamed Page",
      },
      throwOnError: true,
    });
  });

  it("should show error if rename page throws", async () => {
    vi.mocked(sdk.updatePage).mockRejectedValue(new Error("Rename failed"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_rename_page", {
      docId: "doc-123",
      pageIdOrName: "page-456",
      newName: "Renamed Page",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to rename page: Error: Rename failed" }]);
  });
});

describe("coda_resolve_link", () => {
  it("should resolve browser link successfully", async () => {
    vi.mocked(sdk.resolveBrowserLink).mockResolvedValue({
      data: {
        resource: {
          id: "doc-123",
          type: "doc",
          name: "Test Document",
          href: "https://coda.io/d/doc-123",
        },
        browserLink: "https://coda.io/d/doc-123/Test-Page_ptest123",
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_resolve_link", {
      url: "https://coda.io/d/doc-123/Test-Page_ptest123",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          resource: {
            id: "doc-123",
            type: "doc",
            name: "Test Document",
            href: "https://coda.io/d/doc-123",
          },
          browserLink: "https://coda.io/d/doc-123/Test-Page_ptest123",
        }),
      },
    ]);
    expect(sdk.resolveBrowserLink).toHaveBeenCalledWith({
      query: { url: "https://coda.io/d/doc-123/Test-Page_ptest123" },
      throwOnError: true,
    });
  });

  it("should resolve page link successfully", async () => {
    vi.mocked(sdk.resolveBrowserLink).mockResolvedValue({
      data: {
        resource: {
          id: "page-456",
          type: "page",
          name: "Test Page",
          href: "https://coda.io/d/doc-123/Test-Page_ptest456",
        },
        browserLink: "https://coda.io/d/doc-123/Test-Page_ptest456",
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_resolve_link", {
      url: "https://coda.io/d/doc-123/Test-Page_ptest456",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          resource: {
            id: "page-456",
            type: "page",
            name: "Test Page",
            href: "https://coda.io/d/doc-123/Test-Page_ptest456",
          },
          browserLink: "https://coda.io/d/doc-123/Test-Page_ptest456",
        }),
      },
    ]);
    expect(sdk.resolveBrowserLink).toHaveBeenCalledWith({
      query: { url: "https://coda.io/d/doc-123/Test-Page_ptest456" },
      throwOnError: true,
    });
  });

  it("should resolve table link successfully", async () => {
    vi.mocked(sdk.resolveBrowserLink).mockResolvedValue({
      data: {
        resource: {
          id: "table-789",
          type: "table",
          name: "Test Table",
          href: "https://coda.io/d/doc-123/Test-Table_ttable789",
        },
        browserLink: "https://coda.io/d/doc-123/Test-Table_ttable789",
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_resolve_link", {
      url: "https://coda.io/d/doc-123/Test-Table_ttable789",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          resource: {
            id: "table-789",
            type: "table",
            name: "Test Table",
            href: "https://coda.io/d/doc-123/Test-Table_ttable789",
          },
          browserLink: "https://coda.io/d/doc-123/Test-Table_ttable789",
        }),
      },
    ]);
  });

  it("should handle empty URL parameter", async () => {
    vi.mocked(sdk.resolveBrowserLink).mockResolvedValue({
      data: {
        resource: null,
        browserLink: "",
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_resolve_link", {
      url: "",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          resource: null,
          browserLink: "",
        }),
      },
    ]);
    expect(sdk.resolveBrowserLink).toHaveBeenCalledWith({
      query: { url: "" },
      throwOnError: true,
    });
  });

  it("should show error if resolve link throws due to invalid URL", async () => {
    vi.mocked(sdk.resolveBrowserLink).mockRejectedValue(new Error("Invalid URL format"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_resolve_link", {
      url: "not-a-valid-url",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to resolve link: Error: Invalid URL format" }]);
    expect(result.isError).toBe(true);
  });

  it("should show error if resolve link throws due to access denied", async () => {
    vi.mocked(sdk.resolveBrowserLink).mockRejectedValue(new Error("Access denied"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_resolve_link", {
      url: "https://coda.io/d/private-doc-123",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to resolve link: Error: Access denied" }]);
    expect(result.isError).toBe(true);
  });

  it("should show error if resolve link throws due to not found", async () => {
    vi.mocked(sdk.resolveBrowserLink).mockRejectedValue(new Error("Resource not found"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_resolve_link", {
      url: "https://coda.io/d/nonexistent-doc-456",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to resolve link: Error: Resource not found" }]);
    expect(result.isError).toBe(true);
  });
});

describe("coda_list_tables", () => {
  it("should list tables successfully", async () => {
    vi.mocked(sdk.listTables).mockResolvedValue({
      data: {
        items: [
          { id: "grid-123", name: "Tasks" },
          { id: "grid-456", name: "People" },
        ],
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_tables", { docId: "doc-123" });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          items: [
            { id: "grid-123", name: "Tasks" },
            { id: "grid-456", name: "People" },
          ],
        }),
      },
    ]);
    expect(sdk.listTables).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      query: { limit: undefined, pageToken: undefined },
      throwOnError: true,
    });
  });

  it("should list tables with limit", async () => {
    vi.mocked(sdk.listTables).mockResolvedValue({
      data: { items: [{ id: "grid-123", name: "Tasks" }], nextPageToken: "token-abc" },
    } as any);

    const client = await connect(mcpServer.server);
    await client.callTool("coda_list_tables", { docId: "doc-123", limit: 1 });
    expect(sdk.listTables).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      query: { limit: 1, pageToken: undefined },
      throwOnError: true,
    });
  });

  it("should prioritize nextPageToken over limit", async () => {
    vi.mocked(sdk.listTables).mockResolvedValue({
      data: { items: [] },
    } as any);

    const client = await connect(mcpServer.server);
    await client.callTool("coda_list_tables", { docId: "doc-123", limit: 5, nextPageToken: "token-abc" });
    expect(sdk.listTables).toHaveBeenCalledWith({
      path: { docId: "doc-123" },
      query: { limit: undefined, pageToken: "token-abc" },
      throwOnError: true,
    });
  });

  it("should show error if list tables throws", async () => {
    vi.mocked(sdk.listTables).mockRejectedValue(new Error("Access denied"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_tables", { docId: "doc-123" });
    expect(result.content).toEqual([{ type: "text", text: "Failed to list tables: Error: Access denied" }]);
  });
});

describe("coda_list_columns", () => {
  it("should list columns successfully", async () => {
    vi.mocked(sdk.listColumns).mockResolvedValue({
      data: {
        items: [
          { id: "c-abc", name: "Name" },
          { id: "c-def", name: "Age" },
        ],
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_columns", { docId: "doc-123", tableIdOrName: "grid-123" });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          items: [
            { id: "c-abc", name: "Name" },
            { id: "c-def", name: "Age" },
          ],
        }),
      },
    ]);
    expect(sdk.listColumns).toHaveBeenCalledWith({
      path: { docId: "doc-123", tableIdOrName: "grid-123" },
      query: { limit: undefined, pageToken: undefined },
      throwOnError: true,
    });
  });

  it("should prioritize nextPageToken over limit", async () => {
    vi.mocked(sdk.listColumns).mockResolvedValue({ data: { items: [] } } as any);

    const client = await connect(mcpServer.server);
    await client.callTool("coda_list_columns", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      limit: 10,
      nextPageToken: "token-abc",
    });
    expect(sdk.listColumns).toHaveBeenCalledWith({
      path: { docId: "doc-123", tableIdOrName: "grid-123" },
      query: { limit: undefined, pageToken: "token-abc" },
      throwOnError: true,
    });
  });

  it("should show error if list columns throws", async () => {
    vi.mocked(sdk.listColumns).mockRejectedValue(new Error("Not found"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_columns", { docId: "doc-123", tableIdOrName: "grid-123" });
    expect(result.content).toEqual([{ type: "text", text: "Failed to list columns: Error: Not found" }]);
  });
});

describe("coda_list_rows", () => {
  it("should list rows with useColumnNames defaulting to true", async () => {
    vi.mocked(sdk.listRows).mockResolvedValue({
      data: {
        items: [{ id: "i-row1", name: "Row 1", values: { Name: "Alice", Age: 30 } }],
      },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_rows", { docId: "doc-123", tableIdOrName: "grid-123" });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({
          items: [{ id: "i-row1", name: "Row 1", values: { Name: "Alice", Age: 30 } }],
        }),
      },
    ]);
    expect(sdk.listRows).toHaveBeenCalledWith({
      path: { docId: "doc-123", tableIdOrName: "grid-123" },
      query: {
        query: undefined,
        sortBy: undefined,
        useColumnNames: true,
        valueFormat: "rich",
        limit: undefined,
        pageToken: undefined,
      },
      throwOnError: true,
    });
  });

  it("should list rows with query and sortBy", async () => {
    vi.mocked(sdk.listRows).mockResolvedValue({ data: { items: [] } } as any);

    const client = await connect(mcpServer.server);
    await client.callTool("coda_list_rows", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      query: '"Name":"Alice"',
      sortBy: "updatedAt",
    });
    expect(sdk.listRows).toHaveBeenCalledWith({
      path: { docId: "doc-123", tableIdOrName: "grid-123" },
      query: {
        query: '"Name":"Alice"',
        sortBy: "updatedAt",
        useColumnNames: true,
        valueFormat: "rich",
        limit: undefined,
        pageToken: undefined,
      },
      throwOnError: true,
    });
  });

  it("should prioritize nextPageToken over limit", async () => {
    vi.mocked(sdk.listRows).mockResolvedValue({ data: { items: [] } } as any);

    const client = await connect(mcpServer.server);
    await client.callTool("coda_list_rows", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      limit: 5,
      nextPageToken: "token-abc",
    });
    expect(sdk.listRows).toHaveBeenCalledWith({
      path: { docId: "doc-123", tableIdOrName: "grid-123" },
      query: {
        query: undefined,
        sortBy: undefined,
        useColumnNames: true,
        valueFormat: "rich",
        limit: undefined,
        pageToken: "token-abc",
      },
      throwOnError: true,
    });
  });

  it("should show error if list rows throws", async () => {
    vi.mocked(sdk.listRows).mockRejectedValue(new Error("Bad request"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_list_rows", { docId: "doc-123", tableIdOrName: "grid-123" });
    expect(result.content).toEqual([{ type: "text", text: "Failed to list rows: Error: Bad request" }]);
  });
});

describe("coda_get_row", () => {
  it("should get a row with useColumnNames defaulting to true", async () => {
    vi.mocked(sdk.getRow).mockResolvedValue({
      data: { id: "i-row1", name: "Row 1", values: { Name: "Alice", Age: 30 } },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_get_row", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rowIdOrName: "i-row1",
    });
    expect(result.content).toEqual([
      {
        type: "text",
        text: JSON.stringify({ id: "i-row1", name: "Row 1", values: { Name: "Alice", Age: 30 } }),
      },
    ]);
    expect(sdk.getRow).toHaveBeenCalledWith({
      path: { docId: "doc-123", tableIdOrName: "grid-123", rowIdOrName: "i-row1" },
      query: { useColumnNames: true, valueFormat: "rich" },
      throwOnError: true,
    });
  });

  it("should get a row with useColumnNames set to false", async () => {
    vi.mocked(sdk.getRow).mockResolvedValue({
      data: { id: "i-row1", name: "Row 1", values: { "c-abc": "Alice" } },
    } as any);

    const client = await connect(mcpServer.server);
    await client.callTool("coda_get_row", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rowIdOrName: "i-row1",
      useColumnNames: false,
    });
    expect(sdk.getRow).toHaveBeenCalledWith({
      path: { docId: "doc-123", tableIdOrName: "grid-123", rowIdOrName: "i-row1" },
      query: { useColumnNames: false, valueFormat: "rich" },
      throwOnError: true,
    });
  });

  it("should show error if get row throws", async () => {
    vi.mocked(sdk.getRow).mockRejectedValue(new Error("Row not found"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_get_row", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rowIdOrName: "i-row1",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to get row: Error: Row not found" }]);
  });
});

describe("coda_upsert_rows", () => {
  it("should upsert rows successfully", async () => {
    vi.mocked(sdk.upsertRows).mockResolvedValue({
      data: { requestId: "req-200", addedRowIds: ["i-new1"] },
    } as any);

    const client = await connect(mcpServer.server);
    const rows = JSON.stringify([{ cells: [{ column: "Name", value: "Alice" }] }]);
    const result = await client.callTool("coda_upsert_rows", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rows,
    });
    expect(result.content).toEqual([
      { type: "text", text: JSON.stringify({ requestId: "req-200", addedRowIds: ["i-new1"] }) },
    ]);
    expect(sdk.upsertRows).toHaveBeenCalledWith({
      path: { docId: "doc-123", tableIdOrName: "grid-123" },
      body: { rows: [{ cells: [{ column: "Name", value: "Alice" }] }], keyColumns: undefined },
      throwOnError: true,
    });
  });

  it("should upsert rows with keyColumns", async () => {
    vi.mocked(sdk.upsertRows).mockResolvedValue({
      data: { requestId: "req-201" },
    } as any);

    const client = await connect(mcpServer.server);
    const rows = JSON.stringify([
      {
        cells: [
          { column: "Name", value: "Alice" },
          { column: "Age", value: 31 },
        ],
      },
    ]);
    const keyColumns = JSON.stringify(["Name"]);
    await client.callTool("coda_upsert_rows", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rows,
      keyColumns,
    });
    expect(sdk.upsertRows).toHaveBeenCalledWith({
      path: { docId: "doc-123", tableIdOrName: "grid-123" },
      body: {
        rows: [
          {
            cells: [
              { column: "Name", value: "Alice" },
              { column: "Age", value: 31 },
            ],
          },
        ],
        keyColumns: ["Name"],
      },
      throwOnError: true,
    });
  });

  it("should show error for invalid JSON rows", async () => {
    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_upsert_rows", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rows: "not-json",
    });
    expect(result.content).toEqual([
      expect.objectContaining({ type: "text", text: expect.stringContaining("Failed to upsert rows:") }),
    ]);
    expect(result.isError).toBe(true);
  });

  it("should show error if upsert rows throws", async () => {
    vi.mocked(sdk.upsertRows).mockRejectedValue(new Error("Bad request"));

    const client = await connect(mcpServer.server);
    const rows = JSON.stringify([{ cells: [{ column: "Name", value: "Alice" }] }]);
    const result = await client.callTool("coda_upsert_rows", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rows,
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to upsert rows: Error: Bad request" }]);
  });
});

describe("coda_update_row", () => {
  it("should update row successfully", async () => {
    vi.mocked(sdk.updateRow).mockResolvedValue({
      data: { requestId: "req-300", id: "i-row1" },
    } as any);

    const client = await connect(mcpServer.server);
    const cells = JSON.stringify([{ column: "Name", value: "Bob" }]);
    const result = await client.callTool("coda_update_row", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rowIdOrName: "i-row1",
      cells,
    });
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify({ requestId: "req-300", id: "i-row1" }) }]);
    expect(sdk.updateRow).toHaveBeenCalledWith({
      path: { docId: "doc-123", tableIdOrName: "grid-123", rowIdOrName: "i-row1" },
      body: { row: { cells: [{ column: "Name", value: "Bob" }] } },
      throwOnError: true,
    });
  });

  it("should show error for invalid JSON cells", async () => {
    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_update_row", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rowIdOrName: "i-row1",
      cells: "bad-json",
    });
    expect(result.content).toEqual([
      expect.objectContaining({ type: "text", text: expect.stringContaining("Failed to update row:") }),
    ]);
    expect(result.isError).toBe(true);
  });

  it("should show error if update row throws", async () => {
    vi.mocked(sdk.updateRow).mockRejectedValue(new Error("Update failed"));

    const client = await connect(mcpServer.server);
    const cells = JSON.stringify([{ column: "Name", value: "Bob" }]);
    const result = await client.callTool("coda_update_row", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rowIdOrName: "i-row1",
      cells,
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to update row: Error: Update failed" }]);
  });
});

describe("coda_delete_row", () => {
  it("should delete row successfully", async () => {
    vi.mocked(sdk.deleteRow).mockResolvedValue({
      data: { requestId: "req-400", id: "i-row1" },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_delete_row", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rowIdOrName: "i-row1",
    });
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify({ requestId: "req-400", id: "i-row1" }) }]);
    expect(sdk.deleteRow).toHaveBeenCalledWith({
      path: { docId: "doc-123", tableIdOrName: "grid-123", rowIdOrName: "i-row1" },
      throwOnError: true,
    });
  });

  it("should show error if delete row throws", async () => {
    vi.mocked(sdk.deleteRow).mockRejectedValue(new Error("Not found"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_delete_row", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rowIdOrName: "i-row1",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to delete row: Error: Not found" }]);
  });
});

describe("coda_delete_rows", () => {
  it("should delete multiple rows successfully", async () => {
    vi.mocked(sdk.deleteRows).mockResolvedValue({
      data: { requestId: "req-500", rowIds: ["i-row1", "i-row2"] },
    } as any);

    const client = await connect(mcpServer.server);
    const rowIds = JSON.stringify(["i-row1", "i-row2"]);
    const result = await client.callTool("coda_delete_rows", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rowIds,
    });
    expect(result.content).toEqual([
      { type: "text", text: JSON.stringify({ requestId: "req-500", rowIds: ["i-row1", "i-row2"] }) },
    ]);
    expect(sdk.deleteRows).toHaveBeenCalledWith({
      path: { docId: "doc-123", tableIdOrName: "grid-123" },
      body: { rowIds: ["i-row1", "i-row2"] },
      throwOnError: true,
    });
  });

  it("should show error for invalid JSON rowIds", async () => {
    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_delete_rows", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rowIds: "not-json",
    });
    expect(result.content).toEqual([
      expect.objectContaining({ type: "text", text: expect.stringContaining("Failed to delete rows:") }),
    ]);
    expect(result.isError).toBe(true);
  });

  it("should show error if delete rows throws", async () => {
    vi.mocked(sdk.deleteRows).mockRejectedValue(new Error("Bad request"));

    const client = await connect(mcpServer.server);
    const rowIds = JSON.stringify(["i-row1"]);
    const result = await client.callTool("coda_delete_rows", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rowIds,
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to delete rows: Error: Bad request" }]);
  });
});

describe("coda_push_button", () => {
  it("should push button successfully", async () => {
    vi.mocked(sdk.pushButton).mockResolvedValue({
      data: { requestId: "req-600", rowId: "i-row1", columnId: "c-btn" },
    } as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_push_button", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rowIdOrName: "i-row1",
      columnIdOrName: "c-btn",
    });
    expect(result.content).toEqual([
      { type: "text", text: JSON.stringify({ requestId: "req-600", rowId: "i-row1", columnId: "c-btn" }) },
    ]);
    expect(sdk.pushButton).toHaveBeenCalledWith({
      path: { docId: "doc-123", tableIdOrName: "grid-123", rowIdOrName: "i-row1", columnIdOrName: "c-btn" },
      throwOnError: true,
    });
  });

  it("should show error if push button throws", async () => {
    vi.mocked(sdk.pushButton).mockRejectedValue(new Error("Column is not a button"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_push_button", {
      docId: "doc-123",
      tableIdOrName: "grid-123",
      rowIdOrName: "i-row1",
      columnIdOrName: "c-not-btn",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to push button: Error: Column is not a button" }]);
  });
});
