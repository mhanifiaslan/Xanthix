import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/**
 * Walks a package's transitive dependency tree and returns relative globs
 * (e.g. './node_modules/iyzipay/**\/*') ready to feed into
 * `outputFileTracingIncludes`.
 *
 * We need this because some packages (iyzipay, pdf-parse) load files via
 * dynamic `fs.readdirSync(__dirname + '/...')` calls that Next.js's static
 * tracer can't follow. Without this, the standalone bundle is missing the
 * dependency files and prod throws MODULE_NOT_FOUND for things like
 * `postman-request` (iyzipay's HTTP client).
 */
function transitiveDepGlobs(rootPackage: string): string[] {
  const projectRoot = resolve(__dirname);
  const requireFromHere = createRequire(__filename);
  const seen = new Set<string>();

  function walk(pkgDir: string) {
    if (seen.has(pkgDir)) return;
    seen.add(pkgDir);
    try {
      const pkg = requireFromHere(`${pkgDir}/package.json`) as {
        dependencies?: Record<string, string>;
      };
      const reqFromPkg = createRequire(`${pkgDir}/package.json`);
      for (const dep of Object.keys(pkg.dependencies ?? {})) {
        try {
          const depPkgPath = reqFromPkg.resolve(`${dep}/package.json`);
          walk(dirname(depPkgPath));
        } catch {
          // optional / missing dep — fine, skip
        }
      }
    } catch {
      // unreadable package.json — skip
    }
  }

  try {
    const startPath = requireFromHere.resolve(`${rootPackage}/package.json`);
    walk(dirname(startPath));
  } catch {
    return [];
  }

  return Array.from(seen).map(
    (abs) => `./${relative(projectRoot, abs).replace(/\\/g, '/')}/**/*`,
  );
}

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
  // its API request shapes, then pulls in postman-request which has 70+
  // transitive deps. Next.js's standalone output only copies files
  // referenced statically in the import graph, so without these hints the
  // bundle is missing both iyzipay's resources/ and the entire HTTP
  // client tree → MODULE_NOT_FOUND in production. Auto-discover the full
  // tree at config-load time so adding/upgrading payment packages doesn't
  // require touching this list.
  //
  // The trailing /* in the route key is required — bare /** does not
  // match every route in Next.js's minimatch matcher.
  outputFileTracingIncludes: {
    '/**/*': transitiveDepGlobs('iyzipay'),
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
