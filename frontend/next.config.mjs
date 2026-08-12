/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    const backend = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
      // Gateway is proxied same-origin too, so consumer apps can use the
      // domain URL (e.g. https://route.jagoai.dev/gateway/v1/...) with no
      // extra port exposure or CORS setup on the host.
      {
        source: "/gateway/:path*",
        destination: `${backend}/gateway/:path*`,
      },
    ];
  },
};

export default nextConfig;