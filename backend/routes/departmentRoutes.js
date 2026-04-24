import express from "express";
import { getAllDepartments } from "../controllers/departmentController.js";

const router = express.Router();

router.get("/", getAllDepartments);

export default router;
