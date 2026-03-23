import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse v2 depends on pdfjs-dist which uses dynamic worker imports
  // that resolve relative to the file's own path.  When Turbopack bundles
  // the package into a single chunk the relative "./pdf.worker.mjs" path
  // no longer resolves, causing the fake-worker setup to fail at runtime.
  // Marking pdf-parse (and its transitive pdfjs-dist dependency) as
  // server-external keeps them in node_modules, preserves relative-path
  // resolution, and ensures the files are included in the Netlify / AWS
  // Lambda deployment bundle via the .nft.json manifest.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
