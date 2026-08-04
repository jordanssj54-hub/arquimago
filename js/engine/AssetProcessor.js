/**
 * AssetProcessor.js
 * Dynamic image analysis, spritesheet/tileset slicing, fallback generation.
 * Processes raw assets into clean atlas tiles stored in-memory (Canvas-backed).
 */

const DEFAULT_TILE = 32;
const DEFAULT_SPRITE_FRAME = 64;
const GENERATED_PREFIX = "generated:";

class AssetMetadata {
    constructor(img, kind) {
        this.img = img;
        this.kind = kind;
        this.width = img.naturalWidth || img.width;
        this.height = img.naturalHeight || img.height;
        this.cols = 0;
        this.rows = 0;
        this.frameW = 0;
        this.frameH = 0;
        this.totalFrames = 0;
        this.tiles = new Map();
        this.ready = false;
    }
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load: " + src));
        img.src = src;
    });
}

function sampleTileColor(img, col, row, frameW, frameH) {
    const canvas = document.createElement("canvas");
    canvas.width = frameW;
    canvas.height = frameH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, col * frameW, row * frameH, frameW, frameH, 0, 0, frameW, frameH);
    return ctx.getImageData(0, 0, frameW, frameH);
}

function isMostlyTransparent(imageData) {
    const data = imageData.data;
    let opaque = 0;
    const total = data.length / 4;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 128) opaque++;
    }
    return opaque / total < 0.15;
}

function isMostlyGreen(imageData) {
    const data = imageData.data;
    let greenDominated = 0;
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 128) {
            total++;
            if (data[i + 1] > data[i] && data[i + 1] > data[i + 2] && data[i + 1] > 40) {
                greenDominated++;
            }
        }
    }
    return total > 0 && greenDominated / total > 0.6;
}

function sampleDominantColor(imageData) {
    const data = imageData.data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 128) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
        }
    }
    if (count === 0) return { r: 26, g: 58, b: 26, a: 255 };
    return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count), a: 255 };
}

function colorDistance(c1, c2) {
    return Math.sqrt(
        (c1.r - c2.r) ** 2 +
        (c1.g - c2.g) ** 2 +
        (c1.b - c2.b) ** 2
    );
}

function extractTileToCanvas(img, sx, sy, tw, th) {
    const c = document.createElement("canvas");
    c.width = tw;
    c.height = th;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, sx, sy, tw, th, 0, 0, tw, th);
    return c;
}

function generateFallbackTile(tileId, tw, th) {
    const c = document.createElement("canvas");
    c.width = tw;
    c.height = th;
    const ctx = c.getContext("2d");

    const COLORS = {
        0: "#1a3a1a", 1: "#3a2a1a", 2: "#3a3a3a", 3: "#5a4a2a",
        4: "#4a3020", 5: "#1a1a3a", 6: "#1a2a4a", 7: "#5a4020",
        8: "#1a1a1a", 9: "#2a2a3a", 10: "#0d1f0d", 11: "#2a2a2a",
        12: "#1a1a1a", 13: "#1a3a1a", 14: "#3a2010", 15: "#4a4a4a",
        16: "#5a4020", 17: "#0a0510", 18: "#2a2218", 19: "#1a3a1a",
    };

    const baseColor = COLORS[tileId] || "#1a3a1a";
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, tw, th);

    if (tileId === 0 || tileId === 19) {
        ctx.fillStyle = "rgba(30, 80, 30, 0.3)";
        for (let i = 0; i < 4; i++) {
            const gx = ((tileId * 7 + i * 11) % (tw - 2)) + 1;
            const gy = ((tileId * 13 + i * 7) % (th - 4)) + 2;
            ctx.fillRect(gx, gy, 1, 3);
        }
    }

    if (tileId === 10) {
        ctx.fillStyle = "#2a1a0a";
        ctx.fillRect(tw / 2 - 3, th / 2 + 2, 6, th / 2 - 2);
        ctx.fillStyle = "#1a4a1a";
        ctx.beginPath();
        ctx.arc(tw / 2, th / 2 - 2, tw / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
    }

    if (tileId === 11) {
        ctx.fillStyle = "#4a4a4a";
        ctx.beginPath();
        ctx.ellipse(tw / 2, th * 0.6, tw / 2 - 2, th / 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5a5a5a";
        ctx.beginPath();
        ctx.ellipse(tw / 2 - 2, th * 0.55, tw / 3, th / 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    if (tileId === 6) {
        ctx.fillStyle = "rgba(40, 80, 160, 0.4)";
        ctx.fillRect(0, th / 2 - 2, tw, 4);
    }

    if (tileId === 13) {
        ctx.fillStyle = "#2a5a2a";
        ctx.beginPath();
        ctx.arc(tw / 2, th * 0.6, tw / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a7a3a";
        ctx.beginPath();
        ctx.arc(tw / 2 - 2, th * 0.55, tw / 5, 0, Math.PI * 2);
        ctx.fill();
    }

    return c;
}

function generateGrassFallback(tw, th) {
    return generateFallbackTile(0, tw, th);
}

export function createAssetProcessor() {
    const registry = {};
    const processedCanvases = {};

    async function processTileset(src) {
        let meta;
        try {
            const img = await loadImage(src);
            meta = new AssetMetadata(img, "tileset");
        } catch (e) {
            return null;
        }

        meta.frameW = DEFAULT_TILE;
        meta.frameH = DEFAULT_TILE;
        meta.cols = Math.floor(meta.width / meta.frameW);
        meta.rows = Math.floor(meta.height / meta.frameH);
        meta.totalFrames = meta.cols * meta.rows;
        meta.ready = true;
        meta.fallbackTile = generateGrassFallback(meta.frameW, meta.frameH);
        return meta;
    }

    async function processSpritesheet(src) {
        let meta;
        try {
            const img = await loadImage(src);
            meta = new AssetMetadata(img, "spritesheet");
        } catch (e) {
            return null;
        }

        const w = meta.width;
        const h = meta.height;
        const candidateSizes = [64, 48, 32, 96, 80, 56, 128, 192, 256];
        let bestSize = null;
        let bestScore = -1;

        for (const s of candidateSizes) {
            if (w % s !== 0 || h % s !== 0) continue;
            const c = w / s;
            const r = h / s;
            if (c < 4 || r < 4) continue;
            const score = c * r;
            if (score > bestScore) {
                bestScore = score;
                bestSize = s;
            }
        }

        if (!bestSize) {
            meta.frameW = Math.floor(w / 4);
            meta.frameH = Math.floor(h / 4);
            meta.cols = 4;
            meta.rows = 4;
        } else {
            meta.frameW = bestSize;
            meta.frameH = bestSize;
            meta.cols = w / bestSize;
            meta.rows = h / bestSize;
        }

        meta.totalFrames = meta.cols * meta.rows;
        meta.ready = true;
        return meta;
    }

    async function processDirectionSprite(src) {
        try {
            const img = await loadImage(src);
            const meta = new AssetMetadata(img, "spritesheet");

            const w = meta.width;
            const h = meta.height;

            let frameW = 32;
            let frameH = 32;
            let cols = Math.floor(w / frameW);
            let rows = Math.floor(h / frameH);

            if (w < 32 || h < 32) {
                frameW = w;
                frameH = h;
                cols = 1;
                rows = 1;
            }

            if (cols === 0) cols = 1;
            if (rows === 0) rows = 1;

            meta.frameW = frameW;
            meta.frameH = frameH;
            meta.cols = cols;
            meta.rows = rows;
            meta.totalFrames = cols * meta.rows;
            meta.ready = true;

            const perfect = (w % 32 === 0 && h % 32 === 0);
            console.log("[AssetProcessor] Direction sprite:", w + "x" + h,
                "→ frame:", frameW + "x" + frameH,
                ", grid:", cols + "x" + rows,
                ", total:", meta.totalFrames,
                perfect ? "(perfect fit)" : "(edge frames clipped)");

            return meta;
        } catch (e) {
            return null;
        }
    }

    function buildTilesetIndex(meta, tileIdToPos) {
        if (!meta || !meta.ready) return;
        meta.tiles.clear();

        for (const [tileId, pos] of Object.entries(tileIdToPos)) {
            const id = Number(tileId);
            if (pos === null || pos === undefined) continue;
            const sx = pos.col * meta.frameW;
            const sy = pos.row * meta.frameH;
            if (sx + meta.frameW <= meta.width && sy + meta.frameH <= meta.height) {
                meta.tiles.set(id, { sx, sy });
            }
        }
    }

    function getTileCanvas(meta, tileId) {
        const key = `${meta.img.src}:${tileId}`;
        if (processedCanvases[key]) return processedCanvases[key];

        const mapping = meta.tiles.get(tileId);
        if (mapping) {
            const canvas = extractTileToCanvas(
                meta.img, mapping.sx, mapping.sy, meta.frameW, meta.frameH
            );
            processedCanvases[key] = canvas;
            return canvas;
        }

        const fb = generateFallbackTile(tileId, meta.frameW, meta.frameH);
        processedCanvases[key] = fb;
        return fb;
    }

    function getGrassFallback(meta) {
        return meta.fallbackTile || generateGrassFallback(meta.frameW, meta.frameH);
    }

    function getSpriteFrame(meta, direction, frameIndex) {
        const dirMap = { down: 0, left: 1, right: 2, up: 3 };
        const dirIdx = dirMap[direction] || 0;
        const dirsPerRow = Math.max(1, Math.floor(meta.rows / 4));
        const row = dirIdx * dirsPerRow;
        const col = Math.min(frameIndex, meta.cols - 1);
        const sx = col * meta.frameW;
        const sy = row * meta.frameH;
        return { sx, sy, sw: meta.frameW, sh: meta.frameH };
    }

    function clearProcessed() {
        for (const key of Object.keys(processedCanvases)) {
            delete processedCanvases[key];
        }
    }

    return {
        processTileset,
        processSpritesheet,
        processDirectionSprite,
        buildTilesetIndex,
        getTileCanvas,
        getGrassFallback,
        getSpriteFrame,
        clearProcessed,
        loadImage,
        generateFallbackTile,
        generateGrassFallback,
        isMostlyTransparent,
        isMostlyGreen,
        sampleDominantColor,
        colorDistance,
    };
}

export const assetProcessor = createAssetProcessor();
