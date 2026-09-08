import type { Environments } from "@paddle/paddle-js";

export function requirePaddleEnvironment(): Environments {
  const raw = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT;
  if (raw !== "sandbox" && raw !== "production") {
    throw new Error(
      'NEXT_PUBLIC_PADDLE_ENVIRONMENT must be set to "sandbox" or "production" (no silent default).',
    );
  }
  return raw;
}

export function requirePaddleClientToken(): string {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is unset. Create a sandbox client token (test_…) in Paddle.",
    );
  }
  return token;
}
