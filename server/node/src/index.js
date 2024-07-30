import 'dotenv/config';
import express from 'express';

import { configureServer } from './server.js';

const app = express();
configureServer(app);

const port = process.env.PORT ?? 8080;
app.listen(port, () => {
  console.log(`Fastlane Sample Application - Server listening at port ${port}`);
});
