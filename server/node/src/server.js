import engines from 'consolidate';
import express from 'express';

import { renderCheckout } from './controllers/checkout.js';
import { createOrder } from './controllers/transaction.js';

export function configureServer(app) {
  app.engine('html', engines.mustache);
  app.set('view engine', 'html');
  app.set('views', '../shared/views');

  app.enable('strict routing');

  app.use(express.json());

  app.get('/', renderCheckout);
  app.post('/transaction', createOrder);

  app.use(express.static('../../client'));
}
