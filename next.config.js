/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler"],
};

module.exports = nextConfig;
