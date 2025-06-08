const REPO_NAME = 'EoC';

// Для Next.js (страницы, документ, стили)
export const getAssetPath = (path: string) => {
    const cleanPath = path.replace(/^\/+/, '');
    return process.env.EXPORT_MODE === 'true' 
        ? `/${REPO_NAME}/${cleanPath}` 
        : `/${cleanPath}`;
};

// Для Phaser (игровые ассеты)
export const getGameAssetPath = (path: string) => {
    const cleanPath = path.replace(/^\/+/, '');
    
    if (typeof window !== 'undefined' && window.location.host.includes('github.io')) {
        return `https://sarodipdiraka.github.io/${REPO_NAME}/assets/${cleanPath}`;
    }
    
    return `/assets/${cleanPath}`;
};