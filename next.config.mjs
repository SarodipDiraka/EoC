/** @type {import('next').NextConfig} */
const isExportMode = process.env.EXPORT_MODE === 'true';

const repoName = '/EoC';

const nextConfig = {
  output: isExportMode ? 'export' : 'standalone',

  trailingSlash: isExportMode,

  ...(isExportMode && {
    basePath: repoName,
    assetPrefix: repoName,
  }),

  typescript: {
    ignoreBuildErrors: true
  },
  
  webpack: (config, { isServer, webpack }) => {
    config.plugins.push(new webpack.IgnorePlugin({
      resourceRegExp: /^cloudflare:sockets$/,
      contextRegExp: /.*/
    }));

    if (!isServer) {
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
