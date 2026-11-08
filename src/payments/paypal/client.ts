export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  webhookId?: string;
}

export function getPayPalConfig(): PayPalConfig {
  return {
    clientId: process.env.PAYPAL_CLIENT_ID || "",
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || "",
    baseUrl:
      process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com",
    webhookId: process.env.PAYPAL_WEBHOOK_ID || "",
  };
}

export function isPayPalConfigured(): boolean {
  const config = getPayPalConfig();
  return Boolean(config.clientId && config.clientSecret);
}

let cachedToken: {
  token: string;
  expiresAt: number;
} | null = null;

export async function getPayPalAccessToken(
  config: PayPalConfig = getPayPalConfig()
): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const authString = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");

  const res = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`PayPal OAuth authentication failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  const expiresIn = data.expires_in || 3600;

  cachedToken = {
    token: data.access_token,
    expiresAt: now + expiresIn * 1000,
  };

  return data.access_token;
}

