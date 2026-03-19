import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "https://coda.io/apis/v1/openapi.yaml",
  output: {
    format: "prettier",
    path: "src/client",
    tsConfigPath: null,
  },
  plugins: ["@hey-api/client-axios"],
});
