import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/tip_el-copiloto-tu-gestión",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
