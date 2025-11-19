import { NextResponse } from 'next/server';

const maskValue = (value: string | undefined | null) => {
  if (!value) return null;
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
};

export async function GET() {
  const publicKey = process.env.NEXAR_MARKETPLACE_PUBLIC_KEY || '';
  const accessToken = process.env.NEXAR_MARKETPLACE_ACCESS_TOKEN || '';
  const appId = process.env.NEXAR_MARKETPLACE_APP_ID || '';
  const clientSecret = process.env.NEXAR_MARKETPLACE_CLIENT_SECRET || '';

  const isConfigured = Boolean(publicKey && accessToken && appId && clientSecret);

  return NextResponse.json({
    isConfigured,
    credentials: {
      publicKey: publicKey || null,
      accessToken: accessToken || null,
      accessTokenMasked: maskValue(accessToken),
      appId: appId || null,
      clientSecret: clientSecret || null,
      clientSecretMasked: maskValue(clientSecret),
    },
  });
}

