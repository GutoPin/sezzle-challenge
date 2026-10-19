# syntax=docker/dockerfile:1

# One image runs the whole app: the Go binary serves the API and the built
# frontend from the same origin, so no CORS or reverse proxy is needed.

FROM node:22-alpine AS web
WORKDIR /web
RUN npm install --global pnpm@12.5.1
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

FROM golang:1.27-alpine AS api
WORKDIR /src
COPY backend/go.mod ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

# distroless has no shell or curl, so the binary probes itself for HEALTHCHECK.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=api /out/api /app/api
COPY --from=web /web/dist /app/web
ENV PORT=8080 \
    STATIC_DIR=/app/web \
    LOG_FORMAT=json
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD ["/app/api", "healthcheck"]
ENTRYPOINT ["/app/api"]
