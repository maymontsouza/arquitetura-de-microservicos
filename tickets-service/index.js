import app from "./server.js";

const port = process.env.PORT || 3003;
app.listen(port, () => console.log(`[tickets] up on :${port}`));
