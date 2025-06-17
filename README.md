# Coda MCP Server

This project implements a Model Context Protocol (MCP) server that acts as a bridge to interact with the [Coda](https://coda.io/) API. It allows an MCP client (like an AI assistant) to perform actions on Coda pages, such as listing, creating, reading, updating, duplicating, and renaming.

## Features

The server exposes the following tools to the MCP client:

- **`coda_list_documents`**: Lists all documents available to the user.
- **`coda_list_pages`**: Lists all pages within the configured Coda document with pagination support.
- **`coda_create_page`**: Creates a new page in the document, optionally under a specified parent page (creating a subpage) and populating it with initial markdown content.
- **`coda_get_page_content`**: Retrieves the content of a specified page (by ID or name) as markdown.
- **`coda_replace_page_content`**: Replaces the content of a specified page with new markdown content.
- **`coda_append_page_content`**: Appends new markdown content to the end of a specified page.
- **`coda_duplicate_page`**: Creates a copy of an existing page with a new name.
- **`coda_rename_page`**: Renames an existing page.
- **`coda_peek_page`**: Peek into the beginning of a page and return a limited number of lines.

## Usage

Add the MCP server to Cursor/Claude Desktop/etc. like so:

```json
{
  "mcpServers": {
    "coda": {
      "command": "npx",
      "args": ["-y", "coda-mcp@latest"],
      "env": {
        "API_KEY": "..."
      }
    }
  }
}
```

Required environment variables:

- `API_KEY`: Your Coda API key. You can generate one from your Coda account settings.

This MCP server is also available with Docker, like so:

```json
{
  "mcpServers": {
    "coda": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "API_KEY", "reaperberri/coda-mcp:latest"],
      "env": {
        "API_KEY": "..."
      }
    }
  }
}
```

## Local Setup

1.  **Prerequisites:**

    - Node.js
    - pnpm

2.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd coda-mcp
    ```

3.  **Install dependencies:**

    ```bash
    pnpm install
    ```

4.  **Build the project:**
    ```bash
    pnpm build
    ```
    This compiles the TypeScript code to JavaScript in the `dist/` directory.

## Running the Server

The MCP server communicates over standard input/output (stdio). To run it, set the environment variables and run the compiled JavaScript file - `dist/index.js`.
