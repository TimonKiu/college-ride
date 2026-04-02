/**
 * OpenFreeMap 矢量暗色底图 + 按 OSM class 分级道路颜色（主干道更亮、小路更暗）。
 * 样式来源：https://tiles.openfreemap.org/styles/dark
 */
export const COLLEGE_VECTOR_MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

function safeSetPaint(map, layerId, prop, value) {
  try {
    if (map.getLayer(layerId)) map.setPaintProperty(layerId, prop, value);
  } catch {
    /* ignore */
  }
}

/**
 * 在 MapLibre map 实例上应用道路分级色（依赖 OFM dark 样式中的 layer id）。
 */
export function applyCollegeRoadHierarchy(map) {
  // 高速 / 快速路：最亮
  safeSetPaint(map, "highway_motorway_inner", "line-color", "#e8eaee");
  safeSetPaint(map, "highway_motorway_casing", "line-color", "#1c1c1e");
  safeSetPaint(map, "highway_motorway_subtle", "line-color", "#c8ccd2");

  const majorInner = [
    "match",
    ["get", "class"],
    "trunk",
    "#d6d8dc",
    "primary",
    "#c4c6cc",
    "secondary",
    "#aeb2b8",
    "tertiary",
    "#969ba0",
    "#84888e",
  ];
  const majorCasing = [
    "match",
    ["get", "class"],
    "trunk",
    "#222224",
    "primary",
    "#1f1f21",
    "secondary",
    "#1d1d1f",
    "tertiary",
    "#1b1b1d",
    "#19191b",
  ];
  const majorSubtle = [
    "match",
    ["get", "class"],
    "trunk",
    "#9a9ea2",
    "primary",
    "#8a8e94",
    "secondary",
    "#7a7e84",
    "tertiary",
    "#6a6e74",
    "#5a5e64",
  ];

  safeSetPaint(map, "highway_major_inner", "line-color", majorInner);
  safeSetPaint(map, "highway_major_casing", "line-color", majorCasing);
  safeSetPaint(map, "highway_major_subtle", "line-color", majorSubtle);

  const minorInner = [
    "match",
    ["get", "class"],
    "minor",
    "#8c9098",
    "service",
    "#6c7078",
    "track",
    "#5c6068",
    "#5c6068",
  ];
  safeSetPaint(map, "highway_minor", "line-color", minorInner);

  safeSetPaint(map, "highway_path", "line-color", "#4a4e54");
  safeSetPaint(map, "highway_path", "line-opacity", 0.88);

  safeSetPaint(map, "road_pier", "line-color", "#3a3a40");
  safeSetPaint(map, "road_area_pier", "fill-color", "#2a2a2e");

  safeSetPaint(map, "highway_name_other", "text-color", "#c8ccd0");
  safeSetPaint(map, "highway_name_other", "text-halo-color", "rgba(0,0,0,0.82)");
  safeSetPaint(map, "highway_name_motorway", "text-color", "#d8dce0");
}
