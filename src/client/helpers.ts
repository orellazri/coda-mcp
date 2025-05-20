import axios from "axios";
import { beginPageContentExport, getPageContentExportStatus } from "./sdk.gen";

export async function getPageContent(docId: string, pageIdOrName: string) {
  let requestId: string | undefined;
  try {
    // Begin page export
    const beginExportResp = await beginPageContentExport({
      path: {
        docId,
        pageIdOrName,
      },
      body: {
        outputFormat: "markdown",
      },
    });
    if (!beginExportResp.data) {
      throw new Error("Failed to begin page content export");
    }
    requestId = beginExportResp.data.id;
  } catch {
    throw new Error("Failed to get page content");
  }

  // Poll for export status
  let retries = 0;
  const maxRetries = 5;
  let downloadLink: string | undefined;

  while (retries < maxRetries) {
    try {
      const exportStatusResp = await getPageContentExportStatus({
        path: {
          docId,
          pageIdOrName,
          requestId,
        },
      });

      if (exportStatusResp.data?.status === "complete") {
        downloadLink = exportStatusResp.data.downloadLink;
        break;
      }
    } catch {
      throw new Error("Failed to get page content export status");
    }

    retries++;
    if (retries >= maxRetries) {
      throw new Error(`Page content export did not complete after ${maxRetries} retries.`);
    }

    // Wait for 5 seconds before polling again
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  if (!downloadLink) {
    throw new Error("Failed to get page content export status");
  }

  try {
    const downloadResponse = await axios.get<string>(downloadLink, {
      responseType: "text",
    });

    const markdownContent = downloadResponse.data;

    return markdownContent;
  } catch {
    throw new Error(`Failed to download exported page content from ${downloadLink}. `);
  }
}
