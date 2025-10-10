FROM node:20-bullseye

# Install additional tools
RUN apt-get update && apt-get install -y \
    git \
    default-mysql-client \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Add node user to sudo group and configure passwordless sudo
RUN usermod -aG sudo node && \
    echo 'node ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Create workspace directory and set ownership
RUN mkdir -p /workspace && chown -R node:node /workspace

# Set working directory
WORKDIR /workspace

# Switch to node user
USER node
