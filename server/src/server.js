# Create server.js
echo 'const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "HulkCart API is running! 💚" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});' > server\server.js