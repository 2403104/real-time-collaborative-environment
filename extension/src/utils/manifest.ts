import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { shouldIgnore } from "./ignoreFilter";

export interface ManifestEntry {
  type: "file" | "folder";
  hash? : string;
}

export type LocalManfest = Record<string, ManifestEntry>;

export async function buildLocalManifest(
  dirPath: string, 
  basePath: string = dirPath,
  manifest: LocalManfest = {}
) : Promise<LocalManfest> {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true }); // Returns: ["main.ts", "utils.ts", "components"] with file or dir types
  } catch (err: any) {
    console.warn(`[Sync] Could not read directory: ${dirPath}`);
    return manifest;
  }
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath).replace(/\\/g, "/");
    if(shouldIgnore(relativePath)) continue;
    if(entry.isDirectory()) {
      manifest[relativePath] = {type: "folder"};
      await buildLocalManifest(fullPath, basePath, manifest);
    } else {
      try {
        const fileBuffer = fs.readFileSync(fullPath);
        const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
        manifest[relativePath] = {type: "file", hash};
      } catch (err: any) {
        console.warn(`[Sync] Could not read/hash file: ${fullPath}`, err);
      }
    }
  }
  return manifest;
}