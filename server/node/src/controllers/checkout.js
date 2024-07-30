import { getClientToken, getPayPalSdkUrl } from '../lib/sdk-script-helpers.js';

export async function renderCheckout(req, res) {
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
