using AspireSampleApp;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Runtime.InteropServices;

var builder =Host.CreateApplicationBuilder(args);

builder.Services.AddLogging((configure) =>
{
    configure.AddConsole();
});
builder.AddServiceDefaults();

builder.AddSqlServerDbContext<SampleDbContext>("sampleDb");

var host = builder.Build();

// マイグレーションを実行・DB内容を初期化
using var scope = host.Services.CreateScope();

var logger = host.Services.GetRequiredService<ILogger<Program>>();

await using (var dbContext = scope.ServiceProvider.GetRequiredService<SampleDbContext>())
{
    await dbContext.Database.MigrateAsync();
    logger.LogInformation("Migrate complete.");

    if (!await dbContext.Tweets.AnyAsync())
    {
        // 初期データを追加
        await dbContext.Tweets.AddRangeAsync(
            new Tweet { Text = "Hello, World!" },
            new Tweet { Text = "Goodbye, World!" }
        );
        await dbContext.SaveChangesAsync();
    }
    else
    {
        logger.LogInformation("Data Exists.DBInitializer will not add any data.");
    }
}

// 初期化完了