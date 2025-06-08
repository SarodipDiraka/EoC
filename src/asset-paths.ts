export const getAssetPath = (path: string) => {
  const basePath = process.env.BASE_PATH || '';
  const assetPrefix = process.env.ASSET_PREFIX || '';
  
  // Удаляем дублирующие слеши
  const cleanPath = path.replace(/^\/+/, '').replace(/\/+/g, '/');
  
  return assetPrefix 
    ? `${assetPrefix}${cleanPath}`
    : `${basePath}/${cleanPath}`;
};