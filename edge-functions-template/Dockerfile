# Dockerfile for Self-Hosted Supabase Edge Functions
# Based on Deno with dynamic function loading

FROM denoland/deno:1.40.0

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create Deno cache directory with proper permissions
# This must be done as root before switching to deno user
RUN mkdir -p /app/.deno_cache && chown deno:deno /app/.deno_cache

# Set Deno cache directory
ENV DENO_DIR=/app/.deno_cache

# Copy functions directory
COPY --chown=deno:deno functions ./functions

# Copy server script
COPY --chown=deno:deno server.ts .

# Switch to non-root user for security
USER deno

# Pre-cache dependencies (optional, improves cold start)
# RUN deno cache --allow-scripts=npm:@supabase/supabase-js@2 server.ts

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD curl --fail http://localhost:8000/_health || exit 1

# Start server with necessary permissions
# --allow-net: Network access for HTTP server and external APIs
# --allow-read: Read functions directory
# --allow-env: Access environment variables
# --unstable: Enable Deno unstable APIs
CMD ["deno", "run", \
  "--allow-net", \
  "--allow-read", \
  "--allow-env", \
  "--unstable", \
  "server.ts"]

