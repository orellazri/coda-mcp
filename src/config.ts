type Config = {
  apiKey: string;
};

export const config: Config = {
  apiKey: process.env.API_KEY!,
};
