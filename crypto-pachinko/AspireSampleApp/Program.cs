
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;

namespace AspireSampleApp;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.AddServiceDefaults();

        // Add services to the container.

        //redisとSQLServerの構成
        builder.AddRedisOutputCache("redis");
        builder.AddSqlServerDbContext<SampleDbContext>("sampleDb");

        builder.Services.AddControllers();
        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        var app = builder.Build();

        app.MapDefaultEndpoints();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseOutputCache();

        //app.MapGet("/tweets",
        //    (SampleDbContext context) =>
        //    {
        //        return context.Tweets.AsAsyncEnumerable();
        //    }
        //);

        //app.MapPost("/tweets",
        //    async (Tweet tweet, SampleDbContext context,ILogger<Program> logger) =>
        //    {
        //        context.Tweets.Add(tweet);
        //        var updated = await context.SaveChangesAsync();
        //        logger.LogInformation("Tweet {text} added. Updated {updated} rows.", tweet.Text,updated);
        //    }
        //);

        // 1 分キャッシュする
        app.MapGet("/tweets",
            [OutputCache(Duration = 60)]
        (SampleDbContext sampleDbContext) =>
            {
                return sampleDbContext.Tweets.AsAsyncEnumerable();
            });

        // データ追加
        app.MapPost("/tweets", async (
            [FromBody] Tweet tweet,
            SampleDbContext sampleDbContext,
            ILogger<Program> logger) =>
        {
            sampleDbContext.Tweets.Add(tweet);
            var updated = await sampleDbContext.SaveChangesAsync();
            logger.LogInformation(
                "Tweet {text} was added. Updated {updated} rows.",
                tweet.Text,
                updated);
        });


        //app.UseAuthorization();


        //app.MapControllers();

        app.Run();
    }
}
