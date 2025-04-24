type Config = {
  apiKey: string;
  docId: string;
};

export const config: Config = {
  apiKey: process.env.API_KEY!,
  docId: process.env.DOC_ID!,
};
