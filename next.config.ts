import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // typedRoutes will be re-enabled once every internal link uses the
  // locale-aware navigation helpers from `@/i18n/navigation`.
  typedRoutes: false,
  // pdf-parse → pdfjs-dist tries to load its worker via dynamic import;
  // iyzipay → does dynamic readdirSync + require() of its lib/resources.
  // Both confuse Webpack/Turbopack. Keeping them external makes Node use
  // its own runtime resolution so the modules load correctly.
  // App Hosting builds with `output: 'standalone'`. Setting it here too
  // keeps local and prod build behaviour identical so deploy-only bugs
  // (missing dynamic-loaded files, etc.) surface during local builds.
  output: 'standalone',
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', 'iyzipay'],
  // iyzipay does fs.readdirSync('./lib/resources') at runtime to discover
  // its API request shapes. Next.js's standalone output only copies files
  // referenced statically in the import graph, so without this hint the
  // resources directory gets stripped → ENOENT in production. Force the
  // entire iyzipay package into the standalone bundle. The trailing /*
  // in the route key is required — bare /** does not match every route.
  outputFileTracingIncludes: {
    '/**/*': ['./node_modules/iyzipay/**/*'],
  },
  experimental: {
    // Default Server Action body cap is 1 MB; PDF guide uploads can be up
    // to 15 MB, so bump the runtime ceiling slightly above that.
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  // We render server-side rather than statically export; remote images for
  // user-uploaded content come from Firebase Storage.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
