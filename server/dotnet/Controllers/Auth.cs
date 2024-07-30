using System.Text;
using System.Text.Json;

public static class Auth
{
    public static string GetAuthAssertionToken(string clientId, string merchantId)
    {
        var header = new { alg = "none" };
        var body = new { iss = clientId, payer_id = merchantId };
        var signature = "";

        var headerEncoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(header)));
        var bodyEncoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(body)));
        var jwtParts = new[] { headerEncoded, bodyEncoded, signature };

        var authAssertion = string.Join('.', jwtParts);

        return authAssertion;
    }
}
