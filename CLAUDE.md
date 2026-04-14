# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at localhost:5173 (auto-opens browser)
npm run build     # Production build to dist/
npm run preview   # Serve the production build locally
```

No test runner is configured in this project.

## Architecture

This is a Vite + React 18 single-page app — a ride-sharing UI prototype for college students.

**Entry point:** `src/main.jsx` → `src/App.jsx` → `src/CollegeRide.jsx`

The entire app UI lives in `src/CollegeRide.jsx` (one large file). It manages all state locally with `useState`/`useEffect` and persists data to `localStorage` under these keys:
- `cr-common-routes-v1` — saved common routes (with optional departure/return times)
- `cr-common-schedule-v1` — weekly schedule entries (weekday + time + destination)
- `cr-driver-published-v1` — driver-published trip listings

**Map stack:** `react-map-gl` (v7, maplibre adapter) + `maplibre-gl` v4. The base map tile style is OpenFreeMap dark (`https://tiles.openfreemap.org/styles/dark`). Road color hierarchy overrides are applied post-load via `applyCollegeRoadHierarchy()` in `src/collegeRoadMapStyle.js`, which calls `map.setPaintProperty` on named OFM layer IDs.

**Geocoding:** Photon API (nominatim.openstreetmap.org-based) is used for address autocomplete. `mergePhotonFeatureLists` deduplicates results from multiple parallel queries.

**Hardcoded data:** JHU campus locations (`JHU_LOCATIONS`) and DC/Baltimore area quick-pick points (`DC_AREA_POINTS`, `BAL_AREA_POINTS`) are defined at the top of `CollegeRide.jsx`. `USER_SCHOOL` is hardcoded as `"Johns Hopkins University"`.

**Styling:** Global map overrides live in `src/map.css`. Component styles are inline via `style={{}}` props throughout `CollegeRide.jsx`.

## UI Rules

- **No emoji in UI.** Do not use emoji as icons, decorations, or button labels. Use SVG only (follow existing `Icon`/`Icons` patterns in the file). Emoji is only acceptable when the project owner explicitly requests it for a specific task.
