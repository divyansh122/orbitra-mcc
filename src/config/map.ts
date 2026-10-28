/**
 * Map tile layers (no API key required). Swap URLs here to change the basemap.
 * Tiles need internet access; offline, the map falls back to the HUD grid and
 * the live position + flight trail still render.
 */
export interface TileLayerConfig {
  label: string
  url: string
  attribution: string
  /** Highest zoom the server provides; Leaflet upscales beyond it. */
  maxNativeZoom: number
}

export const MAP_LAYERS = {
  sat: {
    label: 'SAT',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 19,
  },
  dark: {
    label: 'MAP',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    maxNativeZoom: 16,
  },
} satisfies Record<string, TileLayerConfig>

export type MapLayerId = keyof typeof MAP_LAYERS
export const DEFAULT_MAP_LAYER: MapLayerId = 'sat'
export const DEFAULT_MAP_ZOOM = 17
export const MAP_MAX_ZOOM = 20
