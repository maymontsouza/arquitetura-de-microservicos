import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

app.use(
  "/auth",
  createProxyMiddleware({
    target: "http://auth-service:3001",
    changeOrigin: true,
  })
);

app.use(
  "/directory",
  createProxyMiddleware({
    target: "http://directory-service:3002",
    changeOrigin: true,
  })
);

app.use(
  "/tickets",
  createProxyMiddleware({
    target: "http://tickets-service:3003",
    changeOrigin: true,
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

const port = process.env.PORT || 8081;
app.listen(port, () => console.log(`[gateway] up on :${port}`));
