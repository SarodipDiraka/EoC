export const getGameAssetPath = (path: string) => {
    if (process.env.EXPORT_MODE === 'true') {
        return `${window.location.origin}/EoC/assets/${path}`;
    }
    return `/assets/${path}`;
};