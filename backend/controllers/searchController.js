import { Op } from "sequelize";
import Document from "../models/Document.js";

export const searchDocuments = async (req, res) => {
  try {
    const { query, departments, status, limit = 10, offset = 0 } = req.query;

    const where = {};

    // 🔍 Keyword search
    if (query) {
      where[Op.or] = [
        { file_name: { [Op.iLike]: `%${query}%` } },
        { short_summary_en: { [Op.iLike]: `%${query}%` } },
        { detailed_summary_en: { [Op.iLike]: `%${query}%` } },
      ];
    }

    // 🏢 Department filter (supports multiple)
    if (departments) {
      const deptArray = departments.split(",").map((d) => d.trim());
      where.assigned_departments = { [Op.overlap]: deptArray };
    }

    // 📋 Status filter
    if (status) {
      where.status = status;
    }

    // Query DB
    const documents = await Document.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      total: documents.count,
      results: documents.rows,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
};
