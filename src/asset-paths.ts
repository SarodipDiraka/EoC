const isExportMode = process.env.EXPORT_MODE === 'true';
const repoName = 'EoC';

export const getAssetPath = (path: string) => {
  // Убираем дублирующие слэши
  const cleanPath = path.replace(/^\/+/, '');
  return isExportMode ? `/${repoName}/${cleanPath}` : `/${cleanPath}`;
};