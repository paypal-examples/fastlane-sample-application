import { getAuthAssertionToken } from '../lib/auth.js';

const {
  PAYPAL_API_BASE_URL = 'https://api-m.sandbox.paypal.com', // use https://api-m.paypal.com for production environment
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_MERCHANT_ID,
  PAYPAL_BN_CODE,
} = process.env;

export async function getAccessToken() {
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
    headers.append('PayPal-Partner-Attribution-ID', PAYPAL_BN_CODE);
    headers.append(
      'PayPal-Auth-Assertion',
      getAuthAssertionToken(PAYPAL_CLIENT_ID, PAYPAL_MERCHANT_ID),
    );
  }

  const searchParams = new URLSearchParams();
  searchParams.append('grant_type', 'client_credentials');

  const options = {
    method: 'POST',
    headers,
    body: searchParams,
  };

  const response = await fetch(url, options);
  const data = await response.json();

  return data.access_token;
}

export async function createOrder(req, res) {
  try {
    const { paymentToken, shippingAddress } = req.body;

    const url = `${PAYPAL_API_BASE_URL}/v2/checkout/orders`;

    const headers = new Headers();
    const accessToken = await getAccessToken();
    headers.append('PayPal-Request-Id', Date.now().toString());
    headers.append('Authorization', `Bearer ${accessToken}`);
    headers.append('Content-Type', 'application/json');

    const { fullName } = shippingAddress?.name ?? {};
    const { countryCode, nationalNumber } = shippingAddress?.phoneNumber ?? {};
    const payload = {
      intent: 'CAPTURE',
      payment_source: {
        card: {
          single_use_token: paymentToken.id,
        },
      },
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: '110.00',
          },
          ...(shippingAddress && {
            shipping: {
              type: 'SHIPPING',
              ...(fullName && {
                name: {
                  full_name: fullName,
                },
              }),
              company_name: shippingAddress.companyName || null,
              address: {
                address_line_1: shippingAddress.address.addressLine1,
                address_line_2: shippingAddress.address.addressLine2,
                admin_area_2: shippingAddress.address.adminArea2,
                admin_area_1: shippingAddress.address.adminArea1,
                postal_code: shippingAddress.address.postalCode,
                country_code: shippingAddress.address.countryCode,
              },
              ...(countryCode &&
                nationalNumber && {
                  phone_number: {
                    country_code: countryCode,
                    national_number: nationalNumber,
                  },
                }),
            },
          }),
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    res.status(response.status).json({ result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
