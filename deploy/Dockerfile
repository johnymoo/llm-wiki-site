FROM node:20-bookworm-slim
WORKDIR /app

# Runtime sync invokes build.sh, which needs rsync and the Quartz source tree.
RUN apt-get update \
    && apt-get install -y --no-install-recommends bash ca-certificates git rsync \
    && rm -rf /var/lib/apt/lists/*

# Install the Express runtime separately for stable layer caching.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Quartz is deliberately fetched at the upstream v4.4.1 tag: it is not tracked
# by this repository, so a clean checkout must not depend on a local clone.
RUN git clone --depth 1 --branch v4.4.1 https://github.com/jackyzha0/quartz.git ./quartz \
    && npm ci --prefix ./quartz \
    && rm -rf ./quartz/.git /root/.npm

COPY build.sh server.js ./
COPY scripts ./scripts
COPY overrides ./overrides
COPY deploy/entrypoint.sh ./deploy/entrypoint.sh
RUN chmod +x ./build.sh ./deploy/entrypoint.sh

# The knowledge vault is bind-mounted read-only at /vault by the compose project.
ENV VAULT_DIR=/vault \
    SYNC_STATE_FILE=/data/sync-state.json \
    HOST=0.0.0.0 \
    PORT=49345
EXPOSE 49345
ENTRYPOINT ["./deploy/entrypoint.sh"]
CMD ["node", "server.js"]
