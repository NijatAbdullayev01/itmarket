const path = require('path');
const root = path.resolve(__dirname, '..');

/**
 * Shared PM2 resilience defaults for the live it-market.org stack.
 * Keep memory ceilings above warm Next.js RSS so PM2 does not thrash
 * the host with SIGINT restarts (connection refused behind nginx).
 */
const resilience = {
  instances: 1,
  exec_mode: 'fork',
  autorestart: true,
  max_restarts: 30,
  min_uptime: '15s',
  exp_backoff_restart_delay: 2000,
  kill_timeout: 8000,
  listen_timeout: 15000,
  time: true,
  merge_logs: true,
};

/**
 * Live domain stack behind nginx (it-market.org).
 * API stays NODE_ENV=development until Epoint + real SMTP + non-local S3
 * satisfy production fail-closed validation. Frontends use Next standalone.
 * `next build` copies `.next/static` + `public` into the standalone tree
 * (see scripts/copy-next-standalone-assets.mjs); missing static assets make
 * `/_next/static/*.css` return HTML and the UI renders unstyled.
 */
module.exports = {
  apps: [
    {
      name: 'itmarket-api',
      cwd: path.join(root, 'apps/api'),
      script: 'dist/main.js',
      interpreter: 'node',
      ...resilience,
      env: {
        NODE_ENV: 'development',
      },
      max_memory_restart: '1024M',
      out_file: '/var/log/itmarket/api.out.log',
      error_file: '/var/log/itmarket/api.err.log',
    },
    {
      name: 'itmarket-storefront',
      cwd: path.join(root, 'apps/storefront/.next/standalone/apps/storefront'),
      script: 'server.js',
      interpreter: 'node',
      ...resilience,
      node_args: '--max-old-space-size=1280',
      env: {
        NODE_ENV: 'production',
        PORT: '3010',
        HOSTNAME: '127.0.0.1',
        API_ORIGIN: 'http://127.0.0.1:3001',
        STOREFRONT_ORIGIN: 'https://it-market.org',
        NEXT_PUBLIC_API_URL: 'https://api.it-market.org/api/v1',
        GOOGLE_SITE_VERIFICATION:
          '68pHls3LukmCqztxEgL9xUc23CvgRgE9-KBLeT3EtK0',
      },
      // Warm Next RSS often exceeds 700M; a low ceiling causes restart loops
      // and brief nginx 502s. Cap V8 via node_args instead of thrashing RSS.
      max_memory_restart: '1536M',
      out_file: '/var/log/itmarket/storefront.out.log',
      error_file: '/var/log/itmarket/storefront.err.log',
    },
    {
      name: 'itmarket-backoffice',
      cwd: path.join(root, 'apps/backoffice/.next/standalone/apps/backoffice'),
      script: 'server.js',
      interpreter: 'node',
      ...resilience,
      node_args: '--max-old-space-size=768',
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
        HOSTNAME: '127.0.0.1',
        API_ORIGIN: 'http://127.0.0.1:3001',
        STOREFRONT_ORIGIN: 'https://it-market.org',
        BACKOFFICE_ORIGIN:
          'https://admin.it-market.org,https://mail.it-market.org',
        NEXT_PUBLIC_API_URL: 'https://api.it-market.org/api/v1',
      },
      max_memory_restart: '1024M',
      out_file: '/var/log/itmarket/backoffice.out.log',
      error_file: '/var/log/itmarket/backoffice.err.log',
    },
  ],
};
