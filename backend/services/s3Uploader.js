// CLEANUP: Removed unused imports (path, dotenv) to reduce clutter and avoid confusion. Prakahr Mishra
// dotenv is already loaded via main server file, so importing it here was redundant.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// FIX: Added fs import — required to create file read streams for uploading to S3
import fs from "fs";


// FIX: Initialize AWS S3 client for uploading files.
// Previous version caused "s3 is not defined" errors.


const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

async function uploadToS3(file) {
  const fileStream = fs.createReadStream(file.path);

  const filename = `${Date.now()}_${file.originalname}`;

  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: filename,
    Body: fileStream,
    ContentType: file.mimetype,
  };
  // FIX: Actually upload the file to AWS S3
  await s3.send(new PutObjectCommand(uploadParams));

 
// FIX: Standardized upload response — always return a simple object containing file URL.
// This ensures controllers can safely use req.file.url.
  return {
    url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`
  };
}

export default uploadToS3;
