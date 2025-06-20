/** @type {import('next').NextConfig} */
const isExportMode = process.env.EXPORT_MODE === 'true';

const repoName = 'EoC';

const nextConfig = {
  output: isExportMode ? 'export' : 'standalone',

  trailingSlash: isExportMode,
  basePath: isExportMode ? `/${repoName}` : '',
  assetPrefix: isExportMode ? `/${repoName}/` : '',
  images: {
    unoptimized: isExportMode,
  },

  typescript: {
    ignoreBuildErrors: true
  },
  
  webpack: (config, { isServer, webpack }) => {
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
