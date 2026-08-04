/**
 * HistoryTileLoader.js
 * Hybrid asset loader for the History tab.
 * Supports both individual PNGs and spritesheet-based AutoTiles.
 */

const TILE_SIZE = 32;

const TILE_PNG_MAP = {
    0:  "assets/tiles/grass.png",
    1:  "assets/tiles/dirt.png",
    2:  "assets/tiles/stone.png",
    3:  "assets/tiles/sand.png",
    4:  "assets/tiles/wood_floor.png",
    5:  null,
    6:  null,
    7:  "assets/tiles/bridge.png",
    8:  "assets/tiles/dark_stone.png",
    9:  "assets/tiles/temple_floor.png",
    10: "assets/tiles/tree.png",
    11: "assets/tiles/rock.png",
    12: "assets/tiles/wall.png",
    13: "assets/tiles/bush.png",
    14: "assets/tiles/bookshelf.png",
    15: "assets/tiles/pillar.png",
    16: "assets/tiles/fence.png",
    17: "assets/tiles/dark_wall.png",
    18: "assets/tiles/ruin.png",
    19: "assets/tiles/tall_grass.png",
};

const TILE_SPRITESHEET_MAP = {
    0: "assets/tiles/grass_sheet.png",
};

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load: " + src));
        img.src = src;
    });
}

function generateGrassFallback(tw, th) {
    const c = document.createElement("canvas");
    c.width = tw;
    c.height = th;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#1a3a1a";
    ctx.fillRect(0, 0, tw, th);
    ctx.fillStyle = "rgba(30, 80, 30, 0.3)";
    ctx.fillRect(4, 6, 1, 4);
    ctx.fillRect(14, 12, 1, 4);
    ctx.fillRect(22, 8, 1, 4);
    return c;
}

export function createHistoryTileLoader() {
    const tileImages = {};
    const spritesheets = {};
    let grassFallback = null;
    let loaded = false;
    let loading = false;
    let readyPromise = null;

    function getTileSize() {
        return TILE_SIZE;
    }

    function isReady() {
        return loaded;
    }

    function isTilesetReady() {
        return loaded;
    }

    function getTileImage(tileId) {
        return tileImages[tileId] || null;
    }

    function getSpritesheet(tileId) {
        return spritesheets[tileId] || null;
    }

    function hasSpritesheet(tileId) {
        return tileId in TILE_SPRITESHEET_MAP;
    }

    function getGrassFallback() {
        if (!grassFallback) {
            grassFallback = generateGrassFallback(TILE_SIZE, TILE_SIZE);
        }
        return grassFallback;
    }

    async function load() {
        if (loaded) return true;
        if (loading) return readyPromise;

        loading = true;

        readyPromise = (async () => {
            const allPaths = { ...TILE_PNG_MAP, ...TILE_SPRITESHEET_MAP };
            const entries = Object.entries(allPaths);
            const results = await Promise.allSettled(
                entries.map(([id, path]) => {
                    if (!path) return Promise.resolve(null);
                    return loadImage(path);
                })
            );

            let pngCount = 0;
            let sheetCount = 0;
            entries.forEach(([id], i) => {
                const r = results[i];
                if (r.status === "fulfilled" && r.value) {
                    const numId = Number(id);
                    if (numId in TILE_SPRITESHEET_MAP) {
                        spritesheets[numId] = r.value;
                        sheetCount++;
                    } else {
                        tileImages[numId] = r.value;
                        pngCount++;
                    }
                }
            });

            console.log("[HistoryTileLoader] PNGs:", pngCount, "/ 18 | Spritesheets:", sheetCount);
            loaded = true;
            loading = false;
            return true;
        })();

        return readyPromise;
    }

    function destroy() {
        for (const k of Object.keys(tileImages)) delete tileImages[k];
        for (const k of Object.keys(spritesheets)) delete spritesheets[k];
        grassFallback = null;
        loaded = false;
        loading = false;
        readyPromise = null;
    }

    return {
        load,
        destroy,
        isReady,
        isTilesetReady,
        getTileImage,
        getSpritesheet,
        hasSpritesheet,
        getGrassFallback,
        getTileSize,
    };
}
