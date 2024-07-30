export function getAuthAssertionToken(clientId, merchantId) {
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
