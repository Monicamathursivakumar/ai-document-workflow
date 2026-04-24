import express from "express";
import { importAndSummarize } from "../controllers/integrationController.js";

const router = express.Router();

router.post("/import-and-summarize", importAndSummarize);

export default router;
