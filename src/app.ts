import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

app.get("/api/v1/health/live", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Hue Tourism Backend is running",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});