/**
 * AutoTileRenderer.js
 * Calculates AutoTile indices from neighbor analysis for spritesheet-based rendering.
 * Uses a 4x4 grid (16 variations) based on cardinal direction connectivity.
 *
 * Bitmask layout:
 *   Bit 0 (1): North is same tile
 *   Bit 1 (2): East is same tile
 *   Bit 2 (4): South is same tile
 *   Bit 3 (8): West is same tile
 *
 * Spritesheet layout (row-major):
 *   0  1  2  3    → isolated, W, E, W+E
 *   4  5  6  7    → S, S+W, S+E, S+W+E
 *   8  9 10 11    → N, N+W, N+E, N+W+E
 *  12 13 14 15    → N+S, N+S+W, N+S+E, N+S+W+E
 */

export function calculateAutoTileIndex(tileMap, tx, ty, tileId, roomWidth, roomHeight) {
    function isSameTile(x, y) {
        if (x < 0 || y < 0 || x >= roomWidth || y >= roomHeight) return false;
        return tileMap[y][x] === tileId;
    }

    const n = isSameTile(tx, ty - 1);
    const e = isSameTile(tx + 1, ty);
    const s = isSameTile(tx, ty + 1);
    const w = isSameTile(tx - 1, ty);

    return (n ? 8 : 0) + (s ? 4 : 0) + (e ? 2 : 0) + (w ? 1 : 0);
}

export function drawAutoTile(ctx, spritesheet, index, dx, dy, tileSize) {
    const cols = 4;
    const row = Math.floor(index / cols);
    const col = index % cols;
    const sx = col * tileSize;
    const sy = row * tileSize;

    ctx.drawImage(spritesheet, sx, sy, tileSize, tileSize, dx, dy, tileSize, tileSize);
}
