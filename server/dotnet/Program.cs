using Microsoft.Extensions.FileProviders;
using DotNetEnv;
using Microsoft.AspNetCore.StaticFiles;

var builder = WebApplication.CreateBuilder(args);

Env.Load();

// Enable CORS middlware
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(
        policy =>
        {
            policy.WithOrigins("*").AllowAnyHeader().AllowAnyMethod();
        });
});

// Add services to the container.
builder.Services.Configure<TemplateSettings>(
    builder.Configuration.GetSection("TemplateSettings"));
builder.Services.AddSingleton<TemplatePathResolver>();
builder.Services.AddControllers();
builder.Services.AddHttpClient();


var app = builder.Build();


app.UseDefaultFiles(new DefaultFilesOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(app.Environment.ContentRootPath, "../../client/html/src")),
    RequestPath = ""
});

// Use static files middleware to serve static files
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(app.Environment.ContentRootPath, "../../client/html/src")),
    RequestPath = "",
});

app.UseRouting();

app.UseCors();

app.MapControllers();

// Get port from environment variables or use default and run the server
var port = System.Environment.GetEnvironmentVariable("PORT") ?? "8080";
app.Run($"http://localhost:{port}");
