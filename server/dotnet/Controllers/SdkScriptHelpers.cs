using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

public static class SdkScriptHelpers
{
    private static readonly string _paypalApiBaseUrl = Environment.GetEnvironmentVariable("PAYPAL_API_BASE_URL") ?? "https://api-m.sandbox.paypal.com";
    private static readonly string _paypalSdkBaseUrl = Environment.GetEnvironmentVariable("PAYPAL_SDK_BASE_URL") ?? "https://www.sandbox.paypal.com";
    private static readonly string _paypalClientId = Environment.GetEnvironmentVariable("PAYPAL_CLIENT_ID") ?? "";
    private static readonly string _paypalClientSecret = Environment.GetEnvironmentVariable("PAYPAL_CLIENT_SECRET") ?? "";
    private static readonly string _paypalMerchantId = Environment.GetEnvironmentVariable("PAYPAL_MERCHANT_ID") ?? "";
    private static readonly string _domains = Environment.GetEnvironmentVariable("DOMAINS") ?? "";

    public static string GetPayPalSdkUrl()
    {
        if (string.IsNullOrEmpty(_paypalClientId))
        {
            throw new InvalidOperationException("Missing PAYPAL_CLIENT_ID");
        }

        var sdkUrl = new UriBuilder(new Uri(new Uri(_paypalSdkBaseUrl), "/sdk/js"));
        var sdkParams = new StringBuilder();
        sdkParams.Append($"client-id={_paypalClientId}&components=buttons,fastlane");

        sdkUrl.Query = sdkParams.ToString();

        return sdkUrl.ToString();
    }

    public static async Task<string> GetClientTokenAsync(IHttpClientFactory httpClientFactory)
    {
        try
        {
            var httpClient = httpClientFactory.CreateClient();
            var auth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_paypalClientId}:{_paypalClientSecret}"));
            var request = new HttpRequestMessage(HttpMethod.Post, $"{_paypalApiBaseUrl}/v1/oauth2/token");
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", auth);
            request.Content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "client_credentials"),
                new KeyValuePair<string, string>("response_type", "client_token"),
                new KeyValuePair<string, string>("intent", "sdk_init"),
                new KeyValuePair<string, string>("domains[]", _domains)
            });

            if (!string.IsNullOrEmpty(_paypalMerchantId))
            {
                var authAssertionToken = Auth.GetAuthAssertionToken(_paypalClientId, _paypalMerchantId);
                request.Headers.Add("PayPal-Auth-Assertion", authAssertionToken);
            }

            var response = await httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            var jsonDocument = JsonDocument.Parse(content);
            var clientToken = jsonDocument.RootElement.GetProperty("access_token").GetString();

            return clientToken ?? "";
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex);
            return "";
        }
    }
}
