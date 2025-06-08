export const getGameAssetPath = (path: string) => {
    return window.location.host.includes('github.io') 
        ? `https://sarodipdiraka.github.io/EoC/assets/${path.replace(/^\//, '')}`
        : `/assets/${path.replace(/^\//, '')}`;
};