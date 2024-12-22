using Microsoft.EntityFrameworkCore;

namespace AspireSampleApp
{
    public class SampleDbContext(DbContextOptions<SampleDbContext> options) : DbContext(options)
    {
        public DbSet<Tweet> Tweets => Set<Tweet>();
    }

    public class Tweet
    {
        public int TweetId { get; set; }
        public required string Text { get; set; }
    }
}