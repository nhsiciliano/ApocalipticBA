// Assets que Metro registra por `assetExts` (metro.config.js) e importados como módulos: el
// valor es el id numérico que entiende `Asset.fromModule` de expo-asset.
declare module '*.gltf' {
  const assetId: number;
  export default assetId;
}
declare module '*.glb' {
  const assetId: number;
  export default assetId;
}
declare module '*.bin' {
  const assetId: number;
  export default assetId;
}
declare module '*.jpg' {
  const assetId: number;
  export default assetId;
}
declare module '*.png' {
  const assetId: number;
  export default assetId;
}
