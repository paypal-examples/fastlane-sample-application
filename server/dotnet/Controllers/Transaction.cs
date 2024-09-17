using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

[ApiController]
public class TransactionPaypalController : Controller
{
    private static readonly string _paypalApiBaseUrl = Environment.GetEnvironmentVariable("PAYPAL_API_BASE_URL") ?? "https://api-m.sandbox.paypal.com";
    private static readonly string _paypalClientId = Environment.GetEnvironmentVariable("PAYPAL_CLIENT_ID") ?? "";
    private static readonly string _paypalClientSecret = Environment.GetEnvironmentVariable("PAYPAL_CLIENT_SECRET") ?? "";
    private static readonly string _paypalMerchantId = Environment.GetEnvironmentVariable("PAYPAL_MERCHANT_ID") ?? "";
    private readonly IHttpClientFactory _httpClientFactory;
    public TransactionPaypalController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    [HttpPost("transaction")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
    {
        try
        {
            var httpClient = _httpClientFactory.CreateClient("NoSSL");
            var accessToken = await GenerateAccessToken();
            var url = $"{_paypalApiBaseUrl}/v2/checkout/orders";

            var fullName = request?.ShippingAddress?.Name?.FullName;
            var countryCode = request?.ShippingAddress?.PhoneNumber?.CountryCode;
            var nationalNumber = request?.ShippingAddress?.PhoneNumber?.NationalNumber;

            var payload = new
            {
                intent = "CAPTURE",
                payment_source = new
                {
                    card = new
                    {
                        single_use_token = request?.PaymentToken?.Id
                    }
                },
                purchase_units = new[]
                {
                    new
                    {
                        amount = new
                        {
                            currency_code = "USD",
                            value = "110.00"
                        },
                        shipping = request?.ShippingAddress == null ? null : new
                        {
                            type = "SHIPPING",
                            name = !string.IsNullOrEmpty(fullName) ? new { full_name = fullName } : null,
                            company_name = !string.IsNullOrEmpty(request.ShippingAddress?.CompanyName) ? request.ShippingAddress?.CompanyName : null,
                            address = new
                            {
                                address_line_1 = request.ShippingAddress.Address?.AddressLine1,
                                address_line_2 = request.ShippingAddress.Address?.AddressLine2,
                                admin_area_2 = request.ShippingAddress.Address?.AdminArea2,
                                admin_area_1 = request.ShippingAddress.Address?.AdminArea1,
                                postal_code = request.ShippingAddress.Address?.PostalCode,
                                country_code = request.ShippingAddress.Address?.CountryCode
                            },
                            phone_number = !string.IsNullOrEmpty(countryCode) && !string.IsNullOrEmpty(nationalNumber) ?  new {
                                country_code = countryCode,
                                national_number = nationalNumber
                            } : null
                        }
                    }
                }
            };

            var requestMessage = new HttpRequestMessage(HttpMethod.Post, url);
            requestMessage.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            requestMessage.Headers.Add("PayPal-Request-Id", DateTimeOffset.Now.ToUnixTimeMilliseconds().ToString());

            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            requestMessage.Content = content;

            var response = await httpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            return StatusCode((int)response.StatusCode, new { result = JsonDocument.Parse(responseContent).RootElement });
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    private async Task<string> GenerateAccessToken()
    {
        var httpClient = _httpClientFactory.CreateClient();
        if (string.IsNullOrEmpty(_paypalClientId) || string.IsNullOrEmpty(_paypalClientSecret))
        {
            throw new Exception("Missing API credentials");
        }

        var url = $"{_paypalApiBaseUrl}/v1/oauth2/token";
        var auth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_paypalClientId}:{_paypalClientSecret}"));

        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", auth);
        request.Content = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("grant_type", "client_credentials")
        });

        if (!string.IsNullOrEmpty(_paypalMerchantId))
        {
            request.Headers.Add("PayPal-Partner-Attribution-ID", _paypalMerchantId);
            var authAssertionToken = Auth.GetAuthAssertionToken(_paypalClientId, _paypalMerchantId);
            request.Headers.Add("PayPal-Auth-Assertion", authAssertionToken);
        }

        var response = await httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        using (var document = JsonDocument.Parse(content))
        {
            var root = document.RootElement;
            return root.GetProperty("access_token").GetString() ?? "";
        }
    }

    public class CreateOrderRequest
    {
        public PaymentToken? PaymentToken { get; set; }
        public ShippingAddress? ShippingAddress { get; set; }
    }

    public class PaymentToken
    {
        public string? Id { get; set; }
    }

    public class ShippingAddress
    {
        public Name? Name { get; set; }
        public string? CompanyName { get; set; }
        public Address? Address { get; set; }
        public PhoneNumber? PhoneNumber { get; set; }
    }

    public class Name
    {
        public string? FullName { get; set; }
    }

    public class Address
    {
        public string? AddressLine1 { get; set; }
        public string? AddressLine2 { get; set; }
        public string? AdminArea2 { get; set; }
        public string? AdminArea1 { get; set; }
        public string? PostalCode { get; set; }
        public string? CountryCode { get; set; }
    }

    public class PhoneNumber
    {
        public string? CountryCode { get; set; }
        public string? NationalNumber { get; set; }
    }

    public class AccessTokenResponse
    {
        public string? access_token { get; set; }
    }

}
