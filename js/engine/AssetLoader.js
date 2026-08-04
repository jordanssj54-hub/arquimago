/**
 * AssetLoader.js
 * Smart asset loader with fallback mechanisms.
 * Loads tilesets and spritesheets via AssetProcessor, caches results.
 */

import { assetProcessor } from "./AssetProcessor.js";

const DEFAULT_TILESET_PATH = "assets/tiles/forest_ground_tileset.png";

const DIRECTION_FILES = {
    down:  "assets/characters/arquimago_down.png",
    left:  "assets/characters/arquimago_left.png",
    right: "assets/characters/arquimago_right.png",
    up:    "assets/characters/arquimago_up.png",
};

const GRASS_COLOR = "#1a3a1a";

function generateStaticGrassCanvas(tw, th) {
    const c = document.createElement("canvas");
    c.width = tw;
    c.height = th;
    const ctx = c.getContext("2d");
    ctx.fillStyle = GRASS_COLOR;
    ctx.fillRect(0, 0, tw, th);
    ctx.fillStyle = "rgba(30, 80, 30, 0.3)";
    ctx.fillRect(4, 6, 1, 4);
    ctx.fillRect(14, 12, 1, 4);
    ctx.fillRect(22, 8, 1, 4);
    return c;
}

export function createAssetLoader() {
    let tilesetMeta = null;
    let spriteMetas = {};
    let grassCanvas = null;
    let loaded = false;
    let loading = false;
    let readyPromise = null;

    function getTileSize() {
        if (tilesetMeta && tilesetMeta.ready) return tilesetMeta.frameW;
        return 32;
    }

    function getTilesetCols() {
        return tilesetMeta ? tilesetMeta.cols : 48;
    }

    function getTilesetRows() {
        return tilesetMeta ? tilesetMeta.rows : 32;
    }

    function isReady() {
        return loaded;
    }

    function isTilesetReady() {
        return loaded && tilesetMeta && tilesetMeta.ready;
    }

    function getTileCanvas(tileId) {
        if (!tilesetMeta || !tilesetMeta.ready) {
            return grassCanvas || generateStaticGrassCanvas(32, 32);
        }
        return assetProcessor.getTileCanvas(tilesetMeta, tileId);
    }

    function getGrassFallback() {
        if (!grassCanvas) {
            const tw = tilesetMeta ? tilesetMeta.frameW : 32;
            const th = tilesetMeta ? tilesetMeta.frameH : 32;
            grassCanvas = generateStaticGrassCanvas(tw, th);
        }
        return grassCanvas;
    }

    function getSpriteImage(direction) {
        const meta = spriteMetas[direction];
        return meta ? meta.img : null;
    }

    function getSpriteMeta(direction) {
        return spriteMetas[direction] || null;
    }

    function getTilesetImage() {
        return tilesetMeta ? tilesetMeta.img : null;
    }

    function getTilesetMeta() {
        return tilesetMeta;
    }

    async function load(tilesetPath) {
        if (loaded) return true;
        if (loading) return readyPromise;

        loading = true;

        readyPromise = (async () => {
            const tPath = tilesetPath || DEFAULT_TILESET_PATH;

            try {
                tilesetMeta = await assetProcessor.processTileset(tPath);
            } catch (e) {
                tilesetMeta = null;
            }

            const dirs = ["down", "left", "right", "up"];
            const results = await Promise.allSettled(
                dirs.map(dir => assetProcessor.processDirectionSprite(DIRECTION_FILES[dir]))
            );
            dirs.forEach((dir, i) => {
                const r = results[i];
                if (r.status === "fulfilled" && r.value) {
                    spriteMetas[dir] = r.value;
                } else {
                    console.warn("[AssetLoader] Failed to load sprite:", DIRECTION_FILES[dir]);
                    spriteMetas[dir] = null;
                }
            });

            loaded = true;
            loading = false;
            const loadedCount = dirs.filter(d => spriteMetas[d]).length;
            console.log("[AssetLoader] Sprites loaded:", loadedCount, "/ 4");
            return true;
        })();

        return readyPromise;
    }

    function destroy() {
        assetProcessor.clearProcessed();
        tilesetMeta = null;
        spriteMetas = {};
        grassCanvas = null;
        loaded = false;
        loading = false;
        readyPromise = null;
    }

    return {
        load,
        destroy,
        isReady,
        isTilesetReady,
        getTileCanvas,
        getGrassFallback,
        getSpriteImage,
        getSpriteMeta,
        getTilesetImage,
        getTilesetMeta,
        getTileSize,
        getTilesetCols,
        getTilesetRows,
    };
}
