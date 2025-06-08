/** @type {import('next').NextConfig} */
const isExportMode = process.env.EXPORT_MODE === 'true';

const repoName = '/EoC';

const basePath = isExportMode ? `/${repoName}` : '';

const nextConfig = {
  output: isExportMode ? 'export' : 'standalone',

  trailingSlash: isExportMode,
  basePath: basePath,
  assetPrefix: isExportMode ? `https://sarodipdiraka.github.io${basePath}/` : undefined,
  images: {
    unoptimized: isExportMode,
  },

  headers: async () => {
    if (isExportMode) return [];
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  typescript: {
    ignoreBuildErrors: true
  },
  
  webpack: (config, { isServer, webpack }) => {
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.BASE_PATH': JSON.stringify(basePath),
        'process.env.ASSET_PREFIX': JSON.stringify(isExportMode ? `https://sarodipdiraka.github.io${basePath}/` : '')
      })
    );

    config.plugins.push(new webpack.IgnorePlugin({
      resourceRegExp: /^cloudflare:sockets$/,
      contextRegExp: /.*/
    }));

    if (!isServer) {
      config.module.rules.push({
        test: /\.(json|png|jpg|gif|wav|mp3|html)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[hash][ext][query]'
        }
      });

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        pg: false,
        'pg-native': false,
        'cloudflare:sockets': false
      }
    }

    return config;
  },
  
};

export default nextConfig;
