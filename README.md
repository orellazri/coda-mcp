# Coda MCP Server

This project implements a Model Context Protocol (MCP) server that acts as a bridge to interact with the [Coda](https://coda.io/) API. It allows an MCP client (like an AI assistant) to perform actions on a specific Coda document, such as listing, creating, reading, updating, duplicating, and renaming pages.

<a href="https://glama.ai/mcp/servers/@orellazri/coda-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@orellazri/coda-mcp/badge" alt="Coda Server MCP server" />
</a>

## Features

The server exposes the following tools to the MCP client:

- **`list-pages`**: Lists all pages within the configured Coda document.
- **`create-page`**: Creates a new page in the document, optionally populating it with initial markdown content.
- **`get-page-content`**: Retrieves the content of a specified page (by ID or name) as markdown.
- **`replace-page-content`**: Replaces the content of a specified page with new markdown content.
- **`append-page-content`**: Appends new markdown content to the end of a specified page.
- **`duplicate-page`**: Creates a copy of an existing page with a new name.
- **`rename-page`**: Renames an existing page.

## Usage

Add the MCP server to Cursor/Claude Desktop/etc. like so:

```json
{
  "mcpServers": {
    "coda": {
      "command": "npx",
      "args": ["-y", "coda-mcp@latest"],
      "env": {
        "API_KEY": "...",
        "DOC_ID": "..."
      }
    }
  }
}
```

Required environment variables:

- `API_KEY`: Your Coda API key. You can generate one from your Coda account settings.
- `DOC_ID`: The ID of the Coda document you want the server to interact with. You can find this in the document's URL (the part after `_d`).

This MCP is also available with Docker, like so:

```json
{
  "mcpServers": {
    "coda": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "API_KEY", "-e", "DOC_ID", "reaperberri/coda-mcp:latest"],
      "env": {
        "API_KEY": "...",
        "DOC_ID": "..."
      }
    }
  }
}
```

```bash
npx -y coda-mcp@latest
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

## Development

- **Linting:** `pnpm lint`
- **Formatting:** `pnpm format`
- **OpenAPI Client Generation:** `pnpm openapi-ts` (if the Coda API spec changes)
