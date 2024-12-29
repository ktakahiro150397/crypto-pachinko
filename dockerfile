# pip install -r requirements.txt を行い、その後main.pyを実行するマルチステージビルドを行う

# ベースイメージ
FROM python:3.9 AS base
# 作業ディレクトリを設定
WORKDIR /app

# 必要なファイルをコピー
COPY requirements.txt .

# 依存関係をインストール
RUN pip install -r requirements.txt

# 本番用のイメージ
FROM python:3.9-slim AS production
# 作業ディレクトリを設定
WORKDIR /app

# ベースイメージから依存関係をコピー
COPY --from=base /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=base /usr/local/bin /usr/local/bin

# 本番用のファイルをコピー
COPY . .

# 実行
CMD ["python", "main.py"]