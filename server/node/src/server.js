import engines from 'consolidate';
import express from 'express';
import cors from 'cors';

import { renderCheckout } from './controllers/checkout.js';
import { createOrder } from './controllers/transaction.js';
import { getPayPalSdkUrl, getClientToken } from './lib/sdk-script-helpers.js';

export function configureServer(app) {
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
