FROM node:20-bullseye

# Install additional tools
RUN apt-get update && apt-get install -y \
    git \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /workspace

# Switch to node user
USER node
