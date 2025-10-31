import express from "express";
const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "auth" }));

// endpoints placeholder
app.post("/auth/login", (req, res) => {
  const { email } = req.body || {};
  return res.json({
    accessToken: "fake.jwt.token",
    user: { email, roles: ["USUARIO"] }
  });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`[auth] up on :${port}`));
