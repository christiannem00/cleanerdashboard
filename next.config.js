/** @type {import('next').NextConfig} */
const RC_ORIGIN = process.env.RC_APP_ORIGIN || "https://reviewchaser.vercel.app";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy the ReviewChaser dashboard + its operator APIs onto this domain so
    // the rc_session cookie (minted by /api/rc/sso) is same-origin. Background
    // jobs (crons, inbound email, /r/:token review links) stay on the
    // ReviewChaser deployment and are not proxied.
    return [
      { source: "/rc-app", destination: `${RC_ORIGIN}/dashboard` },
      { source: "/favicon.svg", destination: `${RC_ORIGIN}/favicon.svg` },
      // Wildcard: every ReviewChaser endpoint (current and future) proxies
      // through — EXCEPT the admin sms-queue, which stays off the client-facing
      // domain. The portal's own /api/rc/* route handlers are filesystem
      // routes, so they always win over this rewrite.
      { source: "/api/:path((?!sms-queue).*)", destination: `${RC_ORIGIN}/api/:path` },
    ];
  },
};

module.exports = nextConfig;
