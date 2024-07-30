using Microsoft.Extensions.Options;
using Stubble.Core.Builders;

public class TemplatePathResolver
{
    private readonly TemplateSettings _templateSettings;
    private readonly StubbleBuilder _stubbleBuilder;

    public TemplatePathResolver(IOptions<TemplateSettings> templateSettings)
    {
        _templateSettings = templateSettings.Value;
        _stubbleBuilder = new StubbleBuilder();
        InitializeFullTemplateDirectory();
    }

    private void InitializeFullTemplateDirectory()
    {
        if (_templateSettings.TemplateRelativePath != null)
        {
            var currentDirectory = Directory.GetCurrentDirectory();
            var projectDirectory = Directory.GetParent(currentDirectory)?.FullName ?? currentDirectory;
            _templateSettings.FullTemplateDirectory = Path.Combine(projectDirectory, _templateSettings.TemplateRelativePath);
        }
    }

    public async Task<string> RenderTemplateAsync(bool isFlexibleIntegration, Dictionary<string, string> locals)
    {
        var templateName = isFlexibleIntegration ? "checkout-flexible.html" : "checkout.html";
        var templatePath = Path.Combine(_templateSettings.FullTemplateDirectory, templateName);

        if (!File.Exists(templatePath))
        {
            throw new FileNotFoundException($"Template file not found: {templatePath}");
        }

        var template = await File.ReadAllTextAsync(templatePath);
        var renderedHtml = _stubbleBuilder.Build().Render(template, locals);
        return renderedHtml;
    }
}

public class TemplateSettings
{
    public required string TemplateRelativePath { get; set; }
    public required string FullTemplateDirectory { get; set; }
}
