import 'dotenv/config';
import engines from 'consolidate';
import express from 'express';
import cors from 'cors';

const {
  PAYPAL_API_BASE_URL = 'https://api-m.sandbox.paypal.com', // use https://api-m.paypal.com for production environment
  PAYPAL_SDK_BASE_URL = 'https://www.sandbox.paypal.com', // use https://www.paypal.com for production environment
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  DOMAINS,
  PAYPAL_MERCHANT_ID,
  PAYPAL_BN_CODE,
} = process.env;

/* ######################################################################
 * Token generation helpers
 * ###################################################################### */

function getAuthAssertionToken(clientId, merchantId) {
  const header = {
    alg: 'none',
  };
  const body = {
    iss: clientId,
    payer_id: merchantId,
  };
  const signature = '';
  const jwtParts = [header, body, signature];

  const authAssertion = jwtParts
    .map((part) => part && btoa(JSON.stringify(part)))
    .join('.');

  return authAssertion;
}

async function getClientToken() {
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

async function getAccessToken() {
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

/* ######################################################################
 * Serve checkout page
 * ###################################################################### */

function getPayPalSdkUrl() {
  const sdkUrl = new URL('/sdk/js', PAYPAL_SDK_BASE_URL);
  const sdkParams = new URLSearchParams({
    'client-id': PAYPAL_CLIENT_ID,
    components: 'buttons,fastlane',
  });
  sdkUrl.search = sdkParams.toString();

  return sdkUrl.toString();
}

async function renderCheckout(req, res) {
  const isFlexibleIntegration = req.query.flexible !== undefined;

  const sdkUrl = getPayPalSdkUrl();
  const clientToken = await getClientToken();
  const locals = {
    title:
      'Fastlane - PayPal Integration' +
      (isFlexibleIntegration ? ' (Flexible)' : ''),
    prerequisiteScripts: `
      <script
        src="${sdkUrl}"
        data-sdk-client-token="${clientToken}"
        defer
      ></script>
    `,
    initScriptPath: isFlexibleIntegration
      ? 'init-fastlane-flexible.js'
      : 'init-fastlane.js',
    stylesheetPath: 'styles.css',
  };

  res.render(isFlexibleIntegration ? 'checkout-flexible' : 'checkout', locals);
}

/* ######################################################################
 * Process transactions
 * ###################################################################### */

async function createOrder(req, res) {
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

/* ######################################################################
 * Run the server
 * ###################################################################### */

function configureServer(app) {
  app.engine('html', engines.mustache);
  app.set('view engine', 'html');
  app.set('views', '../shared/views');

  app.enable('strict routing');

  app.use(cors());
  app.use(express.json());

  app.get('/', renderCheckout);
  app.post('/transaction', createOrder);

  app.get('/sdk/url', (_req, res) => {
    const sdkUrl = getPayPalSdkUrl();
    res.json({ url: sdkUrl });
  });

  app.get('/sdk/client-token', async (_req, res) => {
    const clientToken = await getClientToken();
    res.json({ clientToken });
  });

  app.use(express.static('../../client/html/src'));
}

const app = express();

configureServer(app);

const port = process.env.PORT ?? 8080;

app.listen(port, () => {
  console.log(`Fastlane Sample Application - Server listening at port ${port}`);
});
