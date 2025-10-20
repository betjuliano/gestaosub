import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Utility to load Docker secrets from files
 * In production, Docker secrets are mounted at /run/secrets/
 * In development, fallback to environment variables
 */
export class SecretsManager {
  private static instance: SecretsManager;
  private secrets: Map<string, string> = new Map();

  private constructor() {
    this.loadSecrets();
  }

  public static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  private loadSecrets(): void {
    const secretsPath = process.env.NODE_ENV === 'production' ? '/run/secrets' : './secrets';
    
    const secretFiles = [
      'db_password',
      'jwt_secret',
      'cookie_secret',
      'aws_access_key_id',
      'aws_secret_access_key',
      'smtp_user',
      'smtp_pass',
      'google_client_secret',
      'openai_api_key',
      'anthropic_api_key'
    ];

    for (const secretName of secretFiles) {
      try {
        const secretPath = join(secretsPath, `${secretName}.txt`);
        const secretValue = readFileSync(secretPath, 'utf8').trim();
        this.secrets.set(secretName, secretValue);
      } catch (error) {
        // Secret file doesn't exist or can't be read
        // This is expected for optional secrets
        console.debug(`Secret ${secretName} not found or not readable`);
      }
    }
  }

  public getSecret(name: string, fallbackEnvVar?: string): string | undefined {
    // First try to get from Docker secrets
    const secret = this.secrets.get(name);
    if (secret) {
      return secret;
    }

    // Fallback to environment variable
    if (fallbackEnvVar) {
      return process.env[fallbackEnvVar];
    }

    // Try environment variable with _FILE suffix (Docker secrets pattern)
    const envFileVar = process.env[`${name.toUpperCase()}_FILE`];
    if (envFileVar) {
      try {
        return readFileSync(envFileVar, 'utf8').trim();
      } catch (error) {
        console.error(`Failed to read secret from file: ${envFileVar}`, error);
      }
    }

    return undefined;
  }

  public getRequiredSecret(name: string, fallbackEnvVar?: string): string {
    const secret = this.getSecret(name, fallbackEnvVar);
    if (!secret) {
      throw new Error(`Required secret '${name}' not found. Make sure the secret file exists or the environment variable is set.`);
    }
    return secret;
  }

  public getAllSecrets(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    const secretNames = [
      'db_password',
      'jwt_secret',
      'cookie_secret',
      'aws_access_key_id',
      'aws_secret_access_key',
      'smtp_user',
      'smtp_pass',
      'google_client_secret',
      'openai_api_key',
      'anthropic_api_key'
    ];

    for (const name of secretNames) {
      status[name] = this.secrets.has(name);
    }

    return status;
  }
}

// Export singleton instance
export const secrets = SecretsManager.getInstance();