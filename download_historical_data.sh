

ticker=btcusdt

mkdir -p historical_data/$ticker
cd historical_data/$ticker

# Download date list
npx binance-fetch -d 2022-01 2025-10 -p spot -t klines -s $ticker -i 1m
npx binance-fetch -d 2025-10-01 2025-10-31 -p spot -t klines -s $ticker -i 1m

# Loop through all zip files and unzip them / delete the zip files
for file in *.zip; do
    unzip "$file"
    rm "$file"
done


# CSV format
# 
# 1499040000000,      // Open time
# "0.01634790",       // Open
# "0.80000000",       // High
# "0.01575800",       // Low
# "0.01577100",       // Close
# "148976.11427815",  // Volume
# 1499644799999,      // Close time
# "2434.19055334",    // Quote asset volume
# 308,                // Number of trades
# "1756.87402397",    // Taker buy base asset volume
# "28.46694368",      // Taker buy quote asset volume
# "17928899.62484339" // Ignore.
