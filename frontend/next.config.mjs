/** @type {import('next').NextConfig} */
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["127.0.0.1", "localhost"],
  },
  // Explicitly set the root to silence the warning about multiple lockfiles
  // This tells Next.js to treat the parent directory (project root) as the tracing root
  outputFileTracingRoot: path.join(__dirname, "../"),
};

export default nextConfig;
