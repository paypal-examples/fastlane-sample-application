import { getAuthAssertionToken } from './auth.js';

const {
  DOMAINS,
  PAYPAL_API_BASE_URL = 'https://api-m.sandbox.paypal.com', // use https://api-m.paypal.com for production environment
  PAYPAL_SDK_BASE_URL = 'https://www.sandbox.paypal.com', // use https://www.paypal.com for production environment
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_MERCHANT_ID,
} = process.env;

export function getPayPalSdkUrl() {
  const sdkUrl = new URL('/sdk/js', PAYPAL_SDK_BASE_URL);
  const sdkParams = new URLSearchParams({
    'client-id': PAYPAL_CLIENT_ID,
    components: 'buttons,fastlane',
  });
  sdkUrl.search = sdkParams.toString();

  return sdkUrl.toString();
}

export async function getClientToken() {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error('Missing API credentials');
    }

    const url = `${PAYPAL_API_BASE_URL}/v1/oauth2/token`;

    const headers = new Headers();
    const auth = Buffer.from(
      `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
    ).toString('base64');
    headers.append('Authorization', `Basic ${auth}`);
    headers.append('Content-Type', 'application/x-www-form-urlencoded');
    if (PAYPAL_MERCHANT_ID) {
      headers.append(
        'PayPal-Auth-Assertion',
        getAuthAssertionToken(PAYPAL_CLIENT_ID, PAYPAL_MERCHANT_ID),
      );
    }

    const searchParams = new URLSearchParams();
    searchParams.append('grant_type', 'client_credentials');
    searchParams.append('response_type', 'client_token');
    searchParams.append('intent', 'sdk_init');
    searchParams.append('domains[]', DOMAINS);

    const options = {
      method: 'POST',
      headers,
      body: searchParams,
    };

    const response = await fetch(url, options);
    const data = await response.json();

    return data.access_token;
  } catch (error) {
    console.error(error);

    return '';
  }
}
