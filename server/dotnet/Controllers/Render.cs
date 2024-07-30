using System.Text;
using Microsoft.AspNetCore.Mvc;

public class RenderPaypalController : Controller
{
    private readonly TemplatePathResolver _templatePathResolver;
    private readonly IHttpClientFactory _httpClientFactory;

    public RenderPaypalController(TemplatePathResolver templatePathResolver, IHttpClientFactory httpClientFactory)
    {
        _templatePathResolver = templatePathResolver;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet("/")]
    public async Task<IActionResult> PaypalRender()
    {
        var isFlexibleIntegration = false;
        var queryParams = HttpContext.Request.Query;

        foreach (var param in queryParams)
        {
            if (param.Key == "flexible")
            {
                isFlexibleIntegration = true;
            }
        }

        var sdkUrl = SdkScriptHelpers.GetPayPalSdkUrl();
        var clientToken = await SdkScriptHelpers.GetClientTokenAsync(_httpClientFactory);

        var locals = new Dictionary<string, string>
        {
            { "title", "Fastlane - Paypal Integration" + (isFlexibleIntegration ? " (Flexible)" : "") },
            { "prerequisiteScripts", $@"
                <script
                    src=""{sdkUrl}""
                    data-sdk-client-token=""{clientToken}""
                    defer
                ></script>
            " },
            { "initScriptPath", isFlexibleIntegration ? "init-fastlane-flexible.js" : "init-fastlane.js" },
            { "stylesheetPath", "styles.css" }
        };

        var renderedHtml = await _templatePathResolver.RenderTemplateAsync(isFlexibleIntegration, locals);

        return Content(renderedHtml, "text/html", Encoding.UTF8);
    }
}
