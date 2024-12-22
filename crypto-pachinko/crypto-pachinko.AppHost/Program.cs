var builder = DistributedApplication.CreateBuilder(args);

var redis = builder.AddRedis("redis");
var sql = builder.AddSqlServer("sqlserver");
var sampleDb = sql.AddDatabase("sampledb");

builder.AddProject<Projects.AspireSampleApp>("aspiresampleapp")
    .WithReference(redis)
    .WithReference(sampleDb);

if (builder.ExecutionContext.IsRunMode)
{
    // RunModeのときだけDbInitializerを実行するように構成
    builder.AddProject<Projects.AspireSampleApp_DbInitializer>("aspiresampleapp-dbinitializer")
        .WithReference(sampleDb);
}

builder.Build().Run();
