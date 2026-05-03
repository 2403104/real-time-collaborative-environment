"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldIgnore = shouldIgnore;
const IGNORED = [
    ".git",
    "node_modules",
    "dist",
    "out",
    ".next",
    ".nuxt",
    "build",
    ".cache",
    ".vscode",
    ".sync.json",
    ".env",
    ".env.local",
    ".DS_Store",
    "Thumbs.db",
    ".gitignore",
    ".vscodeignore",
    ".sync.json",
    ".vscode",
];
function shouldIgnore(relativePath) {
    const parts = relativePath.split(/[\\/]/);
    return parts.some((part) => IGNORED.includes(part));
}
//# sourceMappingURL=ignoreFilter.js.map