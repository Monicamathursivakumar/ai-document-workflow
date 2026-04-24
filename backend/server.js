import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB, disconnectDB } from "./config/database.js";
import documentRoutes from "./routes/documentRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import routingRoutes from "./routes/routingRoutes.js";
import integrationRoutes from "./routes/integrationRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import { initLLM } from "./services/llm/llmAdapter.js";
import { initChatbotSessionState } from "./services/chatbotSessionService.js";
import { terminatePool } from "./services/ocr/ocrEngine.js"; // <--- Import OCR cleanup
import authRoutes from "./routes/authRoutes.js";
import { PORT } from "./config/constants.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files for uploaded documents
app.use('/documents', express.static(path.join(__dirname, 'public/documents')));

// Initialize LLM
try {
  initLLM();
  console.log("✨ LLM client initialized");
} catch (err) {
  console.error("❌ LLM init error:", err.message);
}

// Routes
app.use("/api/v1", documentRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/routing", routingRoutes);
app.use("/api/v1/integrations", integrationRoutes);
app.use("/api/v1/chatbot", chatbotRoutes);

// Initialize persisted chatbot state used by integrated chatbot APIs
initChatbotSessionState().catch((error) => {
  console.error("❌ Chatbot state init error:", error?.message || error);
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

/**
 * =================================================================
 * 🛑 GRACEFUL SHUTDOWN LOGIC
 * =================================================================
 * Ensures OCR workers and Database connections close cleanly
 * before the Node.js process exits.
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    // Terminate the OCR Worker Pool (Vital for memory cleanup)
    try {
      await terminatePool();
      console.log("✅ OCR Worker Pool terminated.");
    } catch (err) {
      console.error("❌ Error terminating OCR pool:", err);
    }

    try {
      // Close DB connection
      await disconnectDB();
      console.log("✅ Database connection closed.");
    } catch (err) {
      console.error("❌ Error closing DB connection:", err);
    }

    console.log("👋 Goodbye!");
    process.exit(0);
  });
};

// Listen for termination signals
// SIGINT = Ctrl+C (Terminal)
// SIGTERM = Docker stop / Kubernetes / Heroku
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
