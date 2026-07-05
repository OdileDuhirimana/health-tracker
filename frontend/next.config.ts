import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  typescript: {
    // Type-check against a build-specific tsconfig that excludes Vitest
    // config/setup and test files — they aren't part of the app bundle and
    // pull in devDependency types (@vitejs/plugin-react, vitest) that this
    // config's `moduleResolution` can't resolve. The main tsconfig.json
    // (used by the editor and Vitest's own tsconfig-paths resolution)
    // deliberately still includes them.
    tsconfigPath: "./tsconfig.build.json",
  },
};

export default nextConfig;
