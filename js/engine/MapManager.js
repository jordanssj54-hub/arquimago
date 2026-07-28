/**
 * MapManager.js
 * Automatic map conversion and ID remapping logic.
 * Validates tile IDs and remaps out-of-bounds to grass fallback.
 */

const GRASS_TILE = 0;
const MAX_VALID_TILE = 19;

const TILE_COLORS = {
    0: "#1a3a1a", 1: "#3a2a1a", 2: "#3a3a3a", 3: "#5a4a2a",
    4: "#4a3020", 5: "#1a1a3a", 6: "#1a2a4a", 7: "#5a4020",
    8: "#1a1a1a", 9: "#2a2a3a", 10: "#0d1f0d", 11: "#2a2a2a",
    12: "#1a1a1a", 13: "#1a3a1a", 14: "#3a2010", 15: "#4a4a4a",
    16: "#5a4020", 17: "#0a0510", 18: "#2a2218", 19: "#1a3a1a",
};

export const SOLID_TILES = new Set([10, 11, 12, 13, 14, 15, 16, 17, 6, 18]);

const TILESET_POSITIONS = {
    0:  { col: 17, row: 11 },
    1:  { col: 31, row: 24 },
    2:  { col: 33, row: 28 },
    3:  { col: 28, row: 6 },
    4:  { col: 20, row: 21 },
    5:  null,
    6:  null,
    7:  { col: 28, row: 10 },
    8:  { col: 34, row: 30 },
    9:  { col: 37, row: 29 },
    10: { col: 43, row: 30 },
    11: { col: 47, row: 0 },
    12: { col: 34, row: 30 },
    13: { col: 12, row: 3 },
    14: { col: 19, row: 20 },
    15: { col: 24, row: 17 },
    16: { col: 35, row: 11 },
    17: { col: 43, row: 24 },
    18: { col: 31, row: 21 },
    19: { col: 16, row: 11 },
};

export function createMapManager() {
    const processedRooms = new Map();

    function validateTileId(tileId, tilesetCols, tilesetRows) {
        if (tileId === null || tileId === undefined) return GRASS_TILE;
        if (typeof tileId !== "number") return GRASS_TILE;
        if (tileId < 0 || tileId > MAX_VALID_TILE) return GRASS_TILE;
        return tileId;
    }

    function getTilePosition(tileId, tilesetCols, tilesetRows) {
        if (tileId < 0 || tileId > MAX_VALID_TILE) return null;
        const pos = TILESET_POSITIONS[tileId];
        if (!pos) return null;
        if (pos.col >= tilesetCols || pos.row >= tilesetRows) return null;
        return pos;
    }

    function isTileSolid(tileId) {
        return SOLID_TILES.has(tileId);
    }

    function getTileColor(tileId) {
        return TILE_COLORS[tileId] || TILE_COLORS[GRASS_TILE];
    }

    function processRoom(room, tilesetCols, tilesetRows) {
        if (!room || !room.tileMap) return room;

        const key = room.name || JSON.stringify(room.tileMap[0]);
        if (processedRooms.has(key)) return processedRooms.get(key);

        const processed = { ...room };
        processed.tileMap = room.tileMap.map(row =>
            row.map(tile => validateTileId(tile, tilesetCols, tilesetRows))
        );

        processedRooms.set(key, processed);
        return processed;
    }

    function remapTileId(originalId, tilesetCols, tilesetRows) {
        const validated = validateTileId(originalId, tilesetCols, tilesetRows);
        if (validated !== originalId) return GRASS_TILE;
        const pos = getTilePosition(validated, tilesetCols, tilesetRows);
        if (!pos) return GRASS_TILE;
        return validated;
    }

    function getVisibleTiles(camX, camY, viewW, viewH, roomW, roomH, tileSize) {
        const startTX = Math.max(0, Math.floor(camX / tileSize));
        const startTY = Math.max(0, Math.floor(camY / tileSize));
        const endTX = Math.min(roomW - 1, Math.ceil((camX + viewW) / tileSize));
        const endTY = Math.min(roomH - 1, Math.ceil((camY + viewH) / tileSize));
        return { startTX, startTY, endTX, endTY };
    }

    function invalidateCache() {
        processedRooms.clear();
    }

    return {
        validateTileId,
        getTilePosition,
        isTileSolid,
        getTileColor,
        processRoom,
        remapTileId,
        getVisibleTiles,
        invalidateCache,
        SOLID_TILES,
        TILESET_POSITIONS,
        TILE_COLORS,
        MAX_VALID_TILE,
        GRASS_TILE,
    };
}
