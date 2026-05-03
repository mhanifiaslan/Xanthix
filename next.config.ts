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
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', 'iyzipay'],
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
