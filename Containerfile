FROM registry.access.redhat.com/ubi9/nodejs-24-minimal:latest AS base
USER 0
COPY package.json /tmp/package.json
RUN npm install -g "pnpm@$(cd /tmp && node -p "require('./package.json').packageManager.split('@')[1]")" && rm /tmp/package.json
USER 1001
WORKDIR /opt/app-root/src
ENV CI=1 NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY --chown=1001:0 package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=1001:0 packages/ui/package.json packages/ui/package.json
COPY --chown=1001:0 apps/preview/package.json apps/preview/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

# NOTE: `next build` downloads DM Sans from Google Fonts (next/font/google),
# so this stage requires outbound network access.
FROM deps AS build
COPY --chown=1001:0 . .
RUN pnpm --filter @kemo/ui lib && pnpm --filter @kemo/preview build

FROM registry.access.redhat.com/ubi9/nodejs-24-minimal:latest AS runtime
WORKDIR /opt/app-root/src
ENV NODE_ENV=production PORT=8080 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=1001:0 /opt/app-root/src/apps/preview/.next/standalone ./
COPY --from=build --chown=1001:0 /opt/app-root/src/apps/preview/.next/static ./apps/preview/.next/static
COPY --from=build --chown=1001:0 /opt/app-root/src/apps/preview/public ./apps/preview/public
USER 1001
EXPOSE 8080
CMD ["node", "apps/preview/server.js"]
