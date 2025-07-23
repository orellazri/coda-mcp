import { close, connect } from "mcp-testing-kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as helpers from "./client/helpers";
import * as sdk from "./client/sdk.gen";
import { server as mcpServer } from "./server";

vi.mock("./client/sdk.gen");
vi.mock("./client/helpers");
vi.mock("axios");

describe("MCP Server", () => {
  afterEach(async () => {
    await close(mcpServer.server);
    vi.clearAllMocks();
  });

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
