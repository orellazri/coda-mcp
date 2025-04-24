# Coda MCP Server

This project implements a Model Context Protocol (MCP) server that acts as a bridge to interact with the Coda API. It allows an MCP client (like an AI assistant) to perform actions on a specific Coda document, such as listing, creating, reading, updating, and duplicating pages.

## Features

The server exposes the following tools to the MCP client:

- **`list-pages`**: Lists all pages within the configured Coda document.
- **`create-page`**: Creates a new page in the document, optionally populating it with initial markdown content.
- **`get-page-content`**: Retrieves the content of a specified page (by ID or name) as markdown.
- **`update-page`**: Replaces or appends markdown content to a specified page.
- **`duplicate-page`**: Creates a copy of an existing page with a new name.

## Setup

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

4.  **Configuration:**
    This server requires a Coda API key and the ID of the target Coda document. Set the following environment variables:

    - `API_KEY`: Your Coda API key. You can generate one from your Coda account settings.
    - `DOC_ID`: The ID of the Coda document you want the server to interact with. You can find this in the document's URL (the part after `d`).

5.  **Build the project:**
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
