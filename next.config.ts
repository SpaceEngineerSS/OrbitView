import type { NextConfig } from "next";
import CopyWebpackPlugin from "copy-webpack-plugin";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next.js 16 requires explicit turbopack config when using custom webpack config
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: path.join(process.cwd(), "node_modules/cesium/Build/Cesium/Workers"),
              to: "../public/cesium/Workers",
            },
            {
              from: path.join(process.cwd(), "node_modules/cesium/Build/Cesium/ThirdParty"),
              to: "../public/cesium/ThirdParty",
            },
            {
              from: path.join(process.cwd(), "node_modules/cesium/Build/Cesium/Assets"),
              to: "../public/cesium/Assets",
            },
            {
              from: path.join(process.cwd(), "node_modules/cesium/Build/Cesium/Widgets"),
              to: "../public/cesium/Widgets",
            },
          ],
        })
      );
    }
    return config;
  },
};

export default nextConfig;


