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
      expect.objectContaining({ name: "coda_replace_page_content" }),
      expect.objectContaining({ name: "coda_append_page_content" }),
      expect.objectContaining({ name: "coda_duplicate_page" }),
      expect.objectContaining({ name: "coda_rename_page" }),
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
  it("should list pages successfully", async () => {
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
    const result = await client.callTool("coda_create_page", {
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

  it("should show error if getPageContent returns undefined", async () => {
    vi.mocked(helpers.getPageContent).mockResolvedValue(undefined as any);

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_get_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to get page content" }]);
  });

  it("should show error if getPageContent throws", async () => {
    vi.mocked(helpers.getPageContent).mockRejectedValue(new Error("Export failed"));

    const client = await connect(mcpServer.server);
    const result = await client.callTool("coda_get_page_content", {
      docId: "doc-123",
      pageIdOrName: "page-456",
    });
    expect(result.content).toEqual([{ type: "text", text: "Failed to get page content" }]);
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
