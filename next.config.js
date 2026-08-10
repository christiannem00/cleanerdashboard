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
      { source: "/api/dashboard-data", destination: `${RC_ORIGIN}/api/dashboard-data` },
      { source: "/api/customer-action", destination: `${RC_ORIGIN}/api/customer-action` },
      { source: "/api/campaign", destination: `${RC_ORIGIN}/api/campaign` },
      { source: "/api/import-csv", destination: `${RC_ORIGIN}/api/import-csv` },
      { source: "/api/login", destination: `${RC_ORIGIN}/api/login` },
    ];
  },
};

module.exports = nextConfig;
