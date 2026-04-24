import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Document = sequelize.define(
  "Document",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // -- File Metadata --
    file_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Unique Fingerprint of the file content
    file_hash: {
      type: DataTypes.STRING(64), // SHA-256 is always 64 chars
      allowNull: true,
    },
    file_type: {
      type: DataTypes.STRING,
      defaultValue: "pdf",
    },
    storage_url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // references: {
      //   model: "users",
      //   key: "id",
      // },
    },
    file_size: {
      type: DataTypes.BIGINT,
    },

    // --- Priority ---
    priority: {
      type: DataTypes.ENUM("LOW", "NORMAL", "HIGH"),
      defaultValue: "NORMAL",
    },

    // --- Processing Status ---
    status: {
      type: DataTypes.ENUM(
        "UPLOADED",
        "PREPROCESSING",
        "PROCESSING_OCR",
        "PROCESSING_LLM",
        "SUMMARIZING",
        "COMPLETED",
        "FAILED",
        "UNREADABLE"
      ),
      defaultValue: "UPLOADED",
    },
    error_stage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // --- Processing Data ---
    language_detected: {
      type: DataTypes.STRING,
    },
    ocr_confidence: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
    },
    raw_text: {
      type: DataTypes.TEXT, // OCR text, internal use only
    },

    // --- Summaries (Multilingual) ---
    short_summary_en: {
      type: DataTypes.TEXT,
    },
    short_summary_ml: {
      type: DataTypes.TEXT,
    },
    short_summary_hi: {
      type: DataTypes.TEXT,
    },
    short_summary_ta: {
      type: DataTypes.TEXT,
    },
    detailed_summary_en: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
    },
    detailed_summary_ml: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
    },
    detailed_summary_hi: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
    },
    detailed_summary_ta: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
    },

    // --- AI Outputs ---
    action_items: {
      type: DataTypes.JSONB,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    // Track token usage for cost analysis
    llm_metadata: {
      type: DataTypes.JSONB,
    },

    embeddings: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    // --- DOCUMENT CLASSIFICATION ---
    document_type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Safety Circular, Design Change Note, Invoice, etc.",
    },
    document_class: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Primary category: Safety, Finance, Projects, HR, Systems",
    },
    classification_metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Full classification result from AI",
    },

    // --- ROUTING DECISION ---
    routing_decision: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Primary/secondary roles and urgency decision",
    },
    routed_to_roles: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: "All roles assigned to see this document",
    },

    // --- COMPLIANCE & URGENCY ---
    compliance_critical: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Is this a compliance-critical document?",
    },
    urgency_level: {
      type: DataTypes.ENUM("CRITICAL", "TIME_BOUND", "INFORMATIONAL"),
      defaultValue: "INFORMATIONAL",
    },

    // --- ROLE-BASED SUMMARIES ---
    role_summaries: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Summaries tailored for different roles {director_projects, director_systems, ...}",
    },

    // --- TRACKING & REVIEW ---
    routed_at: {
      type: DataTypes.DATE,
    },
    completed_at: {
      type: DataTypes.DATE,
    },
    reviewed_by: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: "Roles that have marked this as reviewed",
    },
    viewed_by: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: "Roles that have viewed this document",
    },

    // --- ASSIGNED DEPARTMENTS ---
    assigned_departments: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
  },
  {
    tableName: "documents",
    timestamps: true,
    indexes: [
      { fields: ["status"] },
      { fields: ["uploaded_by"] },
    ],
  }
);

export default Document;
