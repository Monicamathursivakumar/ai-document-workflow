import express from "express";
import multer from "multer";
import * as chatbotController from "../controllers/chatbotController.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 10,
  },
});

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error("Chatbot route error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  });
};

router.get("/health", asyncHandler(chatbotController.health));
router.get("/documents", asyncHandler(chatbotController.listDocuments));
router.post("/upload", upload.array("files", 10), asyncHandler(chatbotController.upload));
router.post("/chat", asyncHandler(chatbotController.chat));
router.post("/reset", asyncHandler(chatbotController.reset));

export default router;
