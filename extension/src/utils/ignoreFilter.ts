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

export function shouldIgnore(relativePath: string) : boolean {
  const parts = relativePath.split(/[\\/]/);
  return parts.some((part) => IGNORED.includes(part));
}