var builder = DistributedApplication.CreateBuilder(args);

var redis = builder.AddRedis("redis");
var sql = builder.AddSqlServer("sqlserver");
var sampleDb = sql.AddDatabase("sampledb");

builder.AddProject<Projects.AspireSampleApp>("aspiresampleapp")
    .WithReference(redis)
    .WithReference(sampleDb);

if (builder.ExecutionContext.IsRunMode)
{
    // RunMode‚Ì‚Æ‚«‚¾‚¯DbInitializer‚ğÀs‚·‚é‚æ‚¤‚É\¬
    builder.AddProject<Projects.AspireSampleApp_DbInitializer>("aspiresampleapp-dbinitializer")
        .WithReference(sampleDb);
}

builder.Build().Run();
