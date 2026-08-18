FROM node:20-slim
WORKDIR /app
# Install production deps (express) first for layer caching.
COPY package.json package-lock.json ./
RUN npm install --production
# Copy the rest of the app (build context is the repo root).
COPY server.js ./
COPY scripts ./scripts
COPY quartz ./quartz
COPY sync-state.json ./
# The knowledge vault is bind-mounted read-only at /vault by the compose project.
ENV VAULT_DIR=/vault \
    HOST=0.0.0.0 \
    PORT=49345
EXPOSE 49345
CMD ["node", "server.js"]
