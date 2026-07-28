/**
 * AssetLoader.js
 * Smart asset loader with fallback mechanisms.
 * Loads tilesets and spritesheets via AssetProcessor, caches results.
 */

import { assetProcessor } from "./AssetProcessor.js";

const DEFAULT_TILESET_PATH = "assets/tiles/forest_ground_tileset.png";
const DEFAULT_SPRITESHEET_PATH = "assets/characters/arquimago_sheet.png";

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
    let spritesheetMeta = null;
    let grassCanvas = null;
    let loaded = false;
    let loading = false;
    let readyPromise = null;

    function getTileSize() {
        if (tilesetMeta && tilesetMeta.ready) return tilesetMeta.frameW;
        return 32;
    }

    function getSpriteFrameSize() {
        if (spritesheetMeta && spritesheetMeta.ready) {
            return { w: spritesheetMeta.frameW, h: spritesheetMeta.frameH };
        }
        return { w: 64, h: 64 };
    }

    function getSpriteCols() {
        return spritesheetMeta ? spritesheetMeta.cols : 4;
    }

    function getSpriteRows() {
        return spritesheetMeta ? spritesheetMeta.rows : 4;
    }

    function getTilesetCols() {
        return tilesetMeta ? tilesetMeta.cols : 48;
    }

    function getTilesetRows() {
        return tilesetMeta ? tilesetMeta.rows : 32;
    }

    function isTilesetReady() {
        return tilesetMeta !== null && tilesetMeta.ready;
    }

    function isSpritesheetReady() {
        return spritesheetMeta !== null && spritesheetMeta.ready;
    }

    function isReady() {
        return loaded;
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

    function getSpriteFrame(direction, frameIndex) {
        if (!spritesheetMeta || !spritesheetMeta.ready) {
            return null;
        }
        return assetProcessor.getSpriteFrame(spritesheetMeta, direction, frameIndex);
    }

    function getSpriteImage() {
        return spritesheetMeta ? spritesheetMeta.img : null;
    }

    function getTilesetImage() {
        return tilesetMeta ? tilesetMeta.img : null;
    }

    function getTilesetMeta() {
        return tilesetMeta;
    }

    function getSpritesheetMeta() {
        return spritesheetMeta;
    }

    async function load(tilesetPath, spritesheetPath) {
        if (loaded) return true;
        if (loading) return readyPromise;

        loading = true;

        readyPromise = (async () => {
            const tPath = tilesetPath || DEFAULT_TILESET_PATH;
            const sPath = spritesheetPath || DEFAULT_SPRITESHEET_PATH;

            try {
                tilesetMeta = await assetProcessor.processTileset(tPath);
            } catch (e) {
                tilesetMeta = null;
            }

            try {
                spritesheetMeta = await assetProcessor.processSpritesheet(sPath);
            } catch (e) {
                spritesheetMeta = null;
            }

            loaded = true;
            loading = false;
            return true;
        })();

        return readyPromise;
    }

    function destroy() {
        assetProcessor.clearProcessed();
        tilesetMeta = null;
        spritesheetMeta = null;
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
        isSpritesheetReady,
        getTileCanvas,
        getGrassFallback,
        getSpriteFrame,
        getSpriteImage,
        getTilesetImage,
        getTilesetMeta,
        getSpritesheetMeta,
        getTileSize,
        getSpriteFrameSize,
        getSpriteCols,
        getSpriteRows,
        getTilesetCols,
        getTilesetRows,
    };
}
