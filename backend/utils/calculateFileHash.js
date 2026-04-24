import crypto from "crypto";
import fs from "fs";

/**
 * The function `calculateFileHash` calculates the SHA-256 hash of a file specified by the `filePath`
 * parameter using streams in JavaScript.
 * @param filePath - The `filePath` parameter is a string that represents the path to the file for
 * which you want to calculate the SHA-256 hash. This function reads the contents of the file in
 * chunks, updates the hash as data flows in, and finally resolves with the calculated hash in
 * hexadecimal format.
 * @returns The function `calculateFileHash` is being exported as the default export. It takes a
 * `filePath` as a parameter and returns a Promise. The Promise resolves with the SHA-256 hash of the
 * file located at the specified `filePath` in hexadecimal format.
 */
export default function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    // 1. Create a SHA-256 hasher
    const hash = crypto.createHash("sha256");

    // 2. Open the file as a stream (reads chunk by chunk)
    const stream = fs.createReadStream(filePath);

    // 3. As data flows in, update the hash
    stream.on("data", (chunk) => hash.update(chunk));

    // 4. When file ends, output the fingerprint (Hex string)
    stream.on("end", () => resolve(hash.digest("hex")));

    stream.on("error", (err) => reject(err));
  });
}
