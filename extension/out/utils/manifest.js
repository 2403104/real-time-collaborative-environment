"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLocalManifest = buildLocalManifest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ignoreFilter_1 = require("./ignoreFilter");
async function buildLocalManifest(dirPath, basePath = dirPath, manifest = {}) {
    let entries;
    try {
        entries = fs.readdirSync(dirPath, { withFileTypes: true }); // Returns: ["main.ts", "utils.ts", "components"] with file or dir types
    }
    catch (err) {
        console.warn(`[Sync] Could not read directory: ${dirPath}`);
        return manifest;
    }
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(basePath, fullPath).replace(/\\/g, "/");
        if ((0, ignoreFilter_1.shouldIgnore)(relativePath))
            continue;
        if (entry.isDirectory()) {
            manifest[relativePath] = { type: "folder" };
            await buildLocalManifest(fullPath, basePath, manifest);
        }
        else {
            try {
                const fileBuffer = fs.readFileSync(fullPath);
                const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
                manifest[relativePath] = { type: "file", hash };
            }
            catch (err) {
                console.warn(`[Sync] Could not read/hash file: ${fullPath}`, err);
            }
        }
    }
    return manifest;
}
//# sourceMappingURL=manifest.js.map