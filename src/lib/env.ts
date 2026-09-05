import { StandardsConfigurationError } from "@stndrds/client";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new StandardsConfigurationError(`Missing environment variable ${name}`);
  }
  return value;
}
