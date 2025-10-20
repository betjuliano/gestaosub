import { secrets } from './secrets';

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: secrets.getSecret('cookie_secret', 'JWT_SECRET') ?? "",
  jwtSecret: secrets.getSecret('jwt_secret', 'JWT_SECRET') ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  
  // AWS Configuration with secrets support
  awsAccessKeyId: secrets.getSecret('aws_access_key_id', 'AWS_ACCESS_KEY_ID'),
  awsSecretAccessKey: secrets.getSecret('aws_secret_access_key', 'AWS_SECRET_ACCESS_KEY'),
  awsRegion: process.env.AWS_REGION ?? "us-east-1",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "",
  
  // SMTP Configuration with secrets support
  smtpHost: secrets.getSecret('smtp_host', 'SMTP_HOST'),
  smtpUser: secrets.getSecret('smtp_user', 'SMTP_USER'),
  smtpPass: secrets.getSecret('smtp_pass', 'SMTP_PASS'),
  smtpPort: parseInt(process.env.SMTP_PORT ?? "587"),
  smtpFrom: process.env.SMTP_FROM ?? "",
  
  // OAuth Configuration with secrets support
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: secrets.getSecret('google_client_secret', 'GOOGLE_CLIENT_SECRET'),
  
  // LLM Configuration with secrets support
  openaiApiKey: secrets.getSecret('openai_api_key', 'OPENAI_API_KEY'),
  anthropicApiKey: secrets.getSecret('anthropic_api_key', 'ANTHROPIC_API_KEY'),
  llmProvider: process.env.LLM_PROVIDER ?? "openai",
};
