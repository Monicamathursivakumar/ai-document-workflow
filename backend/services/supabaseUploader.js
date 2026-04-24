import fs from "fs";
import path from "path";

// DEBUG: V2 - Local file storage only
const DEBUG_VERSION = "v2-local-storage";

/**
 * Upload file to local storage with public URL
 * Falls back to local storage if Supabase is not available
 */
async function uploadToSupabase(file) {
  try {
    console.log(`📤 [${DEBUG_VERSION}] Uploading file...`);
    console.log("File path:", file.path);
    
    // Verify file exists
    if (!fs.existsSync(file.path)) {
      throw new Error(`File not found at path: ${file.path}`);
    }
    console.log("✅ File exists on disk");
    
    // Create public documents directory if it doesn't exist
    const uploadsDir = path.resolve('./public/documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log("✅ Created public documents directory");
    }
    
    // Generate unique filename
    const filename = `${Date.now()}_${file.originalname}`;
    const publicPath = path.join(uploadsDir, filename);
    
    // Copy file to public directory
    console.log("🔄 Saving file to public directory...");
    fs.copyFileSync(file.path, publicPath);
    console.log("✅ File saved to:", publicPath);
    
    // Generate public URL
    const publicUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/documents/${filename}`;
    console.log("✅ Public URL:", publicUrl);
    
    return {
      url: publicUrl,
      path: filename,
      storage: 'local',
      version: DEBUG_VERSION
    };
    
  } catch (error) {
    console.error("❌ Upload failed:", error.message);
    throw error;
  }
}

export default uploadToSupabase;
