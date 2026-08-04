import { TILE, T } from "./world.js";
import { createHistoryTileLoader } from "./HistoryTileLoader.js";
import { createMapManager } from "./MapManager.js";
import { calculateAutoTileIndex, drawAutoTile } from "./AutoTileRenderer.js";

if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
        const r = typeof radii === "number" ? radii : (Array.isArray(radii) ? radii[0] : 0);
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.arcTo(x + w, y, x + w, y + r, r);
        this.lineTo(x + w, y + h - r);
        this.arcTo(x + w, y + h, x + w - r, y + h, r);
        this.lineTo(x + r, y + h);
        this.arcTo(x, y + h, x, y + h - r, r);
        this.lineTo(x + r, y);
        this.arcTo(x, y, x + r, y, r);
        this.closePath();
    };
}

const GRASS_COLOR = "#1a3a1a";

function generateGrassProcedural(ctx, sx, sy, tw, th, tx, ty) {
    ctx.fillStyle = GRASS_COLOR;
    ctx.fillRect(sx, sy, tw, th);
    ctx.fillStyle = "rgba(30, 80, 30, 0.3)";
    for (let i = 0; i < 3; i++) {
        const gx = sx + ((tx * 7 + i * 11) % (tw - 2)) + 1;
        const gy = sy + ((ty * 13 + i * 7) % (th - 4)) + 2;
        ctx.fillRect(gx, gy, 1, 4);
    }
}

function generateTreeProcedural(ctx, sx, sy, tw, th) {
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(sx + tw / 2 - 3, sy + th / 2 + 2, 6, th / 2 - 2);
    ctx.fillStyle = "#1a4a1a";
    ctx.beginPath();
    ctx.arc(sx + tw / 2, sy + th / 2 - 2, tw / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a5a2a";
    ctx.beginPath();
    ctx.arc(sx + tw / 2 - 2, sy + th / 2 - 4, tw / 3, 0, Math.PI * 2);
    ctx.fill();
}

function generateRockProcedural(ctx, sx, sy, tw, th) {
    ctx.fillStyle = "#4a4a4a";
    ctx.beginPath();
    ctx.ellipse(sx + tw / 2, sy + th * 0.65, tw / 2 - 2, th / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a5a5a";
    ctx.beginPath();
    ctx.ellipse(sx + tw / 2 - 2, sy + th * 0.6, tw / 3, th / 6, 0, 0, Math.PI * 2);
    ctx.fill();
}

function generateWaterProcedural(ctx, sx, sy, tw, th, tx, ty, time) {
    const wave = Math.sin(time * 2 + tx * 0.5 + ty * 0.3) * 2;
    ctx.fillStyle = "#1a2a4a";
    ctx.fillRect(sx, sy, tw, th);
    ctx.fillStyle = "rgba(40, 80, 160, 0.4)";
    ctx.fillRect(sx, sy + th / 2 - 2 + wave, tw, 4);
}

function generateBushProcedural(ctx, sx, sy, tw, th) {
    ctx.fillStyle = "#2a5a2a";
    ctx.beginPath();
    ctx.arc(sx + tw / 2, sy + th * 0.65, tw / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a7a3a";
    ctx.beginPath();
    ctx.arc(sx + tw / 2 - 2, sy + th * 0.6, tw / 5, 0, Math.PI * 2);
    ctx.fill();
}

function generateBookshelfProcedural(ctx, sx, sy, tw, th) {
    ctx.fillStyle = "#4a3020";
    ctx.fillRect(sx + 2, sy + 4, tw - 4, th - 6);
    ctx.fillStyle = "#2a1a0a";
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(sx + 4, sy + 6 + i * 8, tw - 8, 2);
    }
    const bookColors = ["#8a2222", "#22448a", "#228a44", "#8a6a22"];
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = bookColors[i];
        ctx.fillRect(sx + 5 + i * ((tw - 12) / 4), sy + 7 + (i % 2) * 8, (tw - 14) / 4, 7);
    }
}

function generatePillarProcedural(ctx, sx, sy, tw, th) {
    ctx.fillStyle = "#5a5a5a";
    ctx.fillRect(sx + tw / 2 - 5, sy + 4, 10, th - 6);
    ctx.fillStyle = "#6a6a6a";
    ctx.fillRect(sx + tw / 2 - 7, sy + 2, 14, 4);
    ctx.fillRect(sx + tw / 2 - 7, sy + th - 6, 14, 4);
}

function generateWallProcedural(ctx, sx, sy, tw, th, isDark) {
    ctx.fillStyle = isDark ? "#15101a" : "#2a2a2a";
    ctx.fillRect(sx, sy, tw, th);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(sx, sy, tw, 2);
}

function generateRuinProcedural(ctx, sx, sy, tw, th) {
    ctx.fillStyle = "#3a3228";
    ctx.fillRect(sx, sy + th * 0.65, tw, th * 0.35);
    ctx.fillStyle = "#4a4238";
    ctx.fillRect(sx + 4, sy + 8, 6, th / 2);
    ctx.fillRect(sx + 18, sy + 12, 6, th / 2 - 4);
}

function generateCrystalFloorProcedural(ctx, sx, sy, tw, th, tx, ty, time) {
    ctx.fillStyle = "#1a1a3a";
    ctx.fillRect(sx, sy, tw, th);
    const pulse = Math.sin(time * 2 + tx + ty) * 0.2 + 0.3;
    ctx.fillStyle = `rgba(100, 100, 200, ${pulse})`;
    ctx.fillRect(sx + 8, sy + 8, 2, 2);
    ctx.fillRect(sx + 20, sy + 16, 2, 2);
    ctx.fillRect(sx + 12, sy + 24, 2, 2);
}

function drawProceduralTile(ctx, tile, sx, sy, tw, th, tx, ty, time) {
    switch (tile) {
        case T.GRASS: case T.TALL_GRASS:
            generateGrassProcedural(ctx, sx, sy, tw, th, tx, ty); break;
        case T.TREE:
            generateTreeProcedural(ctx, sx, sy, tw, th); break;
        case T.ROCK:
            generateRockProcedural(ctx, sx, sy, tw, th); break;
        case T.WATER:
            generateWaterProcedural(ctx, sx, sy, tw, th, tx, ty, time); break;
        case T.BUSH:
            generateBushProcedural(ctx, sx, sy, tw, th); break;
        case T.BOOKSHELF:
            generateBookshelfProcedural(ctx, sx, sy, tw, th); break;
        case T.PILLAR:
            generatePillarProcedural(ctx, sx, sy, tw, th); break;
        case T.WALL:
            generateWallProcedural(ctx, sx, sy, tw, th, false); break;
        case T.DARK_WALL:
            generateWallProcedural(ctx, sx, sy, tw, th, true); break;
        case T.RUIN:
            generateRuinProcedural(ctx, sx, sy, tw, th); break;
        case T.CRYSTAL_FLOOR:
            generateCrystalFloorProcedural(ctx, sx, sy, tw, th, tx, ty, time); break;
        default:
            generateGrassProcedural(ctx, sx, sy, tw, th, tx, ty); break;
    }
}

const backgroundCache = {};

function loadBackgroundImage(src) {
    if (!src) return Promise.resolve(null);
    if (backgroundCache[src]) return Promise.resolve(backgroundCache[src]);
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { backgroundCache[src] = img; resolve(img); };
        img.onerror = () => { backgroundCache[src] = null; resolve(null); };
        img.src = src;
    });
}

function drawAtmosphericBackground(ctx, colors, w, h, time) {
    if (!colors || colors.length < 2) return;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.5, colors[1] || colors[0]);
    grad.addColorStop(1, colors[2] || colors[0]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    for (let i = 0; i < 30; i++) {
        const sx = (i * 137.5 + time * 2) % w;
        const sy = (i * 97.3 + Math.sin(time + i)) % h;
        const ss = 0.5 + Math.sin(time * 2 + i) * 0.5;
        ctx.fillRect(sx, sy, ss, ss);
    }
}

export function createRenderer(canvas, width, height) {
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;

    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = "low";
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;

    const tileLoader = createHistoryTileLoader();
    const mapManager = createMapManager();
    let assetsReady = false;
    let loadPromise = null;
    let currentBgImage = null;
    let currentBgSrc = "";
    let bgLoadAttempted = false;

    function ensureAssets() {
        if (assetsReady) return Promise.resolve();
        if (loadPromise) return loadPromise;
        loadPromise = tileLoader.load().then(() => {
            assetsReady = true;
        }).catch(() => {
            assetsReady = true;
        });
        return loadPromise;
    }

    ensureAssets();

    function loadRoomBackground(room) {
        if (!room || !room.bg) {
            currentBgImage = null;
            currentBgSrc = "";
            bgLoadAttempted = false;
            return;
        }
        if (room.bg !== currentBgSrc || !bgLoadAttempted) {
            currentBgSrc = room.bg;
            bgLoadAttempted = true;
            loadBackgroundImage(room.bg).then(img => { currentBgImage = img; });
        }
    }

    function drawBackground(room, time) {
        if (currentBgImage) {
            try { ctx.drawImage(currentBgImage, 0, 0, width, height); return; } catch (e) {}
        }
        if (room && room.bgGradient) {
            drawAtmosphericBackground(ctx, room.bgGradient, width, height, time);
        } else if (room && room.bgColor) {
            ctx.fillStyle = room.bgColor;
            ctx.fillRect(0, 0, width, height);
        } else {
            ctx.fillStyle = "#050508";
            ctx.fillRect(0, 0, width, height);
        }
    }

    function clear(room, time) {
        if (!room) {
            ctx.fillStyle = "#050508";
            ctx.fillRect(0, 0, width, height);
            return;
        }
        loadRoomBackground(room);
        drawBackground(room, time);
    }

    function drawRoom(room, camX, camY, time) {
        if (!room || !room.tileMap) return;
        const tw = tileLoader.getTileSize();
        const th = tw;
        const camIX = Math.floor(camX);
        const camIY = Math.floor(camY);

        const { startTX, startTY, endTX, endTY } = mapManager.getVisibleTiles(
            camIX, camIY, width, height, room.width, room.height, tw
        );

        for (let ty = startTY; ty <= endTY; ty++) {
            for (let tx = startTX; tx <= endTX; tx++) {
                if (ty < 0 || ty >= room.height || tx < 0 || tx >= room.width) continue;
                const rawTile = room.tileMap[ty][tx];
                const tile = mapManager.validateTileId(rawTile, 999, 999);
                const sx = tx * tw - camIX;
                const sy = ty * th - camIY;
                const dx = Math.floor(sx);
                const dy = Math.floor(sy);

                if (assetsReady && tileLoader.hasSpritesheet(tile)) {
                    const sheet = tileLoader.getSpritesheet(tile);
                    if (sheet) {
                        const idx = calculateAutoTileIndex(
                            room.tileMap, tx, ty, tile, room.width, room.height
                        );
                        drawAutoTile(ctx, sheet, idx, dx, dy, tw);
                        continue;
                    }
                }

                const tileImg = assetsReady ? tileLoader.getTileImage(tile) : null;
                if (tileImg) {
                    ctx.drawImage(tileImg, dx, dy, tw, th);
                    continue;
                }

                drawProceduralTile(ctx, tile, dx, dy, tw, th, tx, ty, time);
            }
        }
    }

    function drawObject(ctx, obj, camX, camY, time) {
        const tw = tileLoader.getTileSize();
        const sx = obj.x * tw + tw / 2 - camX;
        const sy = obj.y * tw + tw / 2 - camY;

        if (obj.type === "crystal") {
            const pulse = Math.sin(time * 3 + obj.x) * 3;
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = obj.color || "#7b68ee";
            ctx.beginPath();
            ctx.arc(sx, sy, 14 + pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = obj.color || "#7b68ee";
            ctx.beginPath();
            ctx.moveTo(sx, sy - 10 + pulse * 0.5);
            ctx.lineTo(sx + 7, sy);
            ctx.lineTo(sx, sy + 10 + pulse * 0.5);
            ctx.lineTo(sx - 7, sy);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.beginPath();
            ctx.arc(sx - 2, sy - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (obj.type === "chest") {
            const opened = obj.opened;
            ctx.fillStyle = opened ? "#5a4020" : "#8a6a30";
            ctx.fillRect(sx - 10, sy - 6, 20, 14);
            ctx.fillStyle = opened ? "#3a2010" : "#6a4a10";
            ctx.fillRect(sx - 10, sy - 6, 20, 4);
            if (!opened) {
                ctx.fillStyle = "#c9a84c";
                ctx.fillRect(sx - 2, sy - 2, 4, 4);
            }
        }

        if (obj.type === "potion") {
            const bob = Math.sin(time * 4 + obj.x) * 2;
            ctx.fillStyle = obj.color || "#ff4444";
            ctx.beginPath();
            ctx.arc(sx, sy + bob, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.4)";
            ctx.beginPath();
            ctx.arc(sx - 2, sy - 2 + bob, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        if (obj.type === "torch") {
            const flicker = Math.sin(time * 12 + obj.x * 3) * 2;
            if (obj.lit) {
                ctx.fillStyle = "rgba(255, 160, 40, 0.15)";
                ctx.beginPath();
                ctx.arc(sx, sy - 4, 20 + flicker, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#5a3a10";
                ctx.fillRect(sx - 2, sy - 4, 4, 14);
                ctx.fillStyle = "#ff8833";
                ctx.beginPath();
                ctx.arc(sx, sy - 8, 5 + flicker * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ffcc44";
                ctx.beginPath();
                ctx.arc(sx, sy - 9, 3, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = "#3a2a10";
                ctx.fillRect(sx - 2, sy - 4, 4, 14);
                ctx.fillStyle = "#555";
                ctx.beginPath();
                ctx.arc(sx, sy - 6, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (obj.type === "book") {
            const bob = Math.sin(time * 2 + obj.x) * 1;
            ctx.fillStyle = "#8a6a30";
            ctx.fillRect(sx - 6, sy - 4 + bob, 12, 10);
            ctx.fillStyle = "#c9a84c";
            ctx.font = "8px serif";
            ctx.textAlign = "center";
            ctx.fillText("\u2605", sx, sy + 3 + bob);
            ctx.textAlign = "start";
        }

        if (obj.type === "lever") {
            ctx.fillStyle = "#5a5a5a";
            ctx.fillRect(sx - 3, sy - 8, 6, 16);
            ctx.fillStyle = obj.activated ? "#44cc44" : "#cc4444";
            ctx.beginPath();
            ctx.arc(sx, sy - 8, 5, 0, Math.PI * 2);
            ctx.fill();
            if (obj.activated) {
                ctx.save();
                ctx.translate(sx, sy - 8);
                ctx.rotate(0.5);
                ctx.fillStyle = "#5a5a5a";
                ctx.fillRect(-3, -8, 6, 10);
                ctx.restore();
            }
        }

        if (obj.type === "door") {
            ctx.fillStyle = obj.locked ? "#3a3a3a" : "#1a1a1a";
            ctx.fillRect(obj.x * tw + 2, obj.y * tw, tw - 4, tw);
            if (obj.locked) {
                ctx.fillStyle = "#cc4444";
                ctx.beginPath();
                ctx.arc(sx, sy, 4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = "rgba(100,200,100,0.2)";
                ctx.fillRect(obj.x * tw + 2, obj.y * tw, tw - 4, tw);
            }
        }

        if (obj.type === "monument") {
            ctx.fillStyle = "#5a5a6a";
            ctx.fillRect(sx - 12, sy - 16, 24, 32);
            ctx.fillStyle = "#6a6a7a";
            ctx.fillRect(sx - 14, sy - 18, 28, 4);
            ctx.fillStyle = "#c9a84c";
            ctx.font = "10px serif";
            ctx.textAlign = "center";
            ctx.fillText("\u2606", sx, sy + 2);
            ctx.textAlign = "start";
            ctx.fillStyle = "rgba(201,168,76,0.1)";
            ctx.beginPath();
            ctx.arc(sx, sy, 20 + Math.sin(time * 2) * 3, 0, Math.PI * 2);
            ctx.fill();
        }

        if (obj.type === "bookshelf") {
            ctx.fillStyle = "#4a3020";
            ctx.fillRect(obj.x * tw + 1, obj.y * tw + 2, tw - 2, tw - 2);
            ctx.fillStyle = "#2a1a0a";
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(obj.x * tw + 3, obj.y * tw + 4 + i * 9, tw - 6, 2);
            }
        }

        if (obj.type === "portal") {
            const pulse = Math.sin(time * 2) * 4;
            const grad = ctx.createRadialGradient(sx, sy, 2, sx, sy, 18 + pulse);
            grad.addColorStop(0, "rgba(74, 127, 212, 0.6)");
            grad.addColorStop(0.4, "rgba(74, 127, 212, 0.2)");
            grad.addColorStop(1, "rgba(74, 127, 212, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(sx, sy, 18 + pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(201, 168, 76, 0.6)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sx, sy, 8 + pulse * 0.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "#4a7fd4";
            ctx.font = "9px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(obj.label || "Portal", sx, sy + 28);
            ctx.textAlign = "start";
        }

        if (obj.type === "altar") {
            ctx.fillStyle = "#5a4a3a";
            ctx.fillRect(sx - 14, sy - 4, 28, 10);
            ctx.fillStyle = "#6a5a4a";
            ctx.fillRect(sx - 12, sy - 10, 24, 8);
            ctx.fillStyle = "#c9a84c";
            ctx.font = "10px serif";
            ctx.textAlign = "center";
            ctx.fillText("\u2726", sx, sy - 2);
            ctx.textAlign = "start";
            ctx.fillStyle = "rgba(201,168,76,0.08)";
            ctx.beginPath();
            ctx.arc(sx, sy, 22 + Math.sin(time * 1.5) * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        if (obj.type === "ancient_stone") {
            ctx.fillStyle = "#4a4a5a";
            ctx.beginPath();
            ctx.moveTo(sx - 8, sy + 6);
            ctx.lineTo(sx - 6, sy - 12);
            ctx.lineTo(sx + 2, sy - 14);
            ctx.lineTo(sx + 8, sy - 8);
            ctx.lineTo(sx + 10, sy + 6);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#5a5a6a";
            ctx.beginPath();
            ctx.moveTo(sx - 4, sy - 10);
            ctx.lineTo(sx, sy - 12);
            ctx.lineTo(sx + 4, sy - 8);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "rgba(150,150,180,0.3)";
            ctx.font = "7px serif";
            ctx.textAlign = "center";
            ctx.fillText("\u2234", sx, sy + 2);
            ctx.textAlign = "start";
        }

        if (obj.type === "plant") {
            const sway = Math.sin(time * 1.5 + obj.x * 0.5) * 2;
            ctx.fillStyle = obj.color || "#44aa44";
            ctx.beginPath();
            ctx.ellipse(sx + sway, sy - 2, 5, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#2a6a2a";
            ctx.fillRect(sx - 1, sy + 4, 2, 6);
            ctx.fillStyle = "rgba(255,255,255,0.2)";
            ctx.beginPath();
            ctx.arc(sx + sway - 1, sy - 4, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        if (obj.type === "fireplace") {
            ctx.fillStyle = "#3a2a1a";
            ctx.fillRect(sx - 12, sy - 10, 24, 22);
            ctx.fillStyle = "#2a1a0a";
            ctx.fillRect(sx - 8, sy - 6, 16, 14);
            if (obj.lit) {
                const flicker = Math.sin(time * 8) * 2;
                const grad2 = ctx.createRadialGradient(sx, sy - 2, 0, sx, sy - 2, 16 + flicker);
                grad2.addColorStop(0, "rgba(255, 160, 40, 0.3)");
                grad2.addColorStop(1, "rgba(255, 100, 20, 0)");
                ctx.fillStyle = grad2;
                ctx.beginPath();
                ctx.arc(sx, sy - 2, 16 + flicker, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ff8833";
                ctx.beginPath();
                ctx.arc(sx, sy - 4, 4 + flicker * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#ffcc44";
                ctx.beginPath();
                ctx.arc(sx, sy - 5, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (obj.type === "table") {
            ctx.fillStyle = "#4a3020";
            ctx.fillRect(sx - 10, sy - 2, 20, 4);
            ctx.fillStyle = "#3a2010";
            ctx.fillRect(sx - 8, sy + 2, 3, 8);
            ctx.fillRect(sx + 5, sy + 2, 3, 8);
        }

        if (obj.type === "rest_bench") {
            ctx.fillStyle = "#5a4030";
            ctx.fillRect(sx - 12, sy - 4, 24, 8);
            ctx.fillStyle = "#4a3020";
            ctx.fillRect(sx - 10, sy - 2, 20, 4);
            ctx.fillStyle = "#3a2010";
            ctx.fillRect(sx - 8, sy + 4, 4, 6);
            ctx.fillRect(sx + 4, sy + 4, 4, 6);
        }
    }

    function drawNPC(ctx, npc, camX, camY, time) {
        const tw = tileLoader.getTileSize();
        const sx = npc.x * tw + tw / 2 - camX;
        const sy = npc.y * tw + tw / 2 - camY;
        const bob = Math.sin(time * 2) * 1.5;

        ctx.fillStyle = npc.color || "#88aaff";
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(sx, sy + bob, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = npc.color || "#88aaff";
        ctx.beginPath();
        ctx.arc(sx, sy - 4 + bob, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(sx - 2, sy - 6 + bob, 2, 0, Math.PI * 2);
        ctx.arc(sx + 2, sy - 6 + bob, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#c9a84c";
        ctx.font = "9px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(npc.name, sx, sy - 18 + bob);
        ctx.textAlign = "start";

        if (Math.sin(time * 4) > 0) {
            ctx.fillStyle = "rgba(201, 168, 76, 0.7)";
            ctx.font = "10px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("[E]", sx, sy + 20);
            ctx.textAlign = "start";
        }
    }

    function drawHUD(ctx, player, gameState, gameWidth) {
        const barW = 100;
        const barH = 8;
        const pad = 10;

        ctx.fillStyle = "rgba(8, 6, 18, 0.85)";
        ctx.beginPath();
        ctx.roundRect(pad, pad, 180, 58, 8);
        ctx.fill();

        ctx.fillStyle = "#c9a84c";
        ctx.font = "9px Inter, sans-serif";
        ctx.fillText("LV " + (gameState.level || 1), pad + 8, pad + 14);

        ctx.fillStyle = "#c9a84c";
        ctx.fillText("\u2B50 Fragmentos: " + (gameState.memoryFragments ? gameState.memoryFragments.length : 0), pad + 8, pad + 30);

        ctx.fillStyle = "#888";
        ctx.fillText("Cap\u00EDtulos: " + (gameState.chaptersCompleted ? gameState.chaptersCompleted.length : 0) + "/3", pad + 8, pad + 44);

        if (gameState.currentRoom) {
            ctx.fillStyle = "rgba(8, 6, 18, 0.7)";
            ctx.beginPath();
            ctx.roundRect(gameWidth - 140, pad, 130, 36, 6);
            ctx.fill();
            ctx.fillStyle = "#c9a84c";
            ctx.font = "10px Inter, sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(gameState.roomName || "", gameWidth - pad - 8, pad + 15);
            const ch = gameState.chapter || 1;
            ctx.fillStyle = "#888";
            ctx.font = "8px Inter, sans-serif";
            ctx.fillText("CAP\u00CDTULO " + ch, gameWidth - pad - 8, pad + 30);
            ctx.textAlign = "start";
        }

        ctx.fillStyle = "rgba(8, 6, 18, 0.7)";
        ctx.beginPath();
        ctx.roundRect(gameWidth - 140, pad + 42, 130, 18, 6);
        ctx.fill();
        ctx.fillStyle = "#888";
        ctx.font = "8px Inter, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("WASD: Mover  E: A\u00E7\u00E3o", gameWidth - pad - 8, pad + 54);
        ctx.textAlign = "start";
    }

    function drawTransition(ctx, alpha, w, h) {
        if (alpha <= 0) return;
        ctx.fillStyle = `rgba(5, 5, 8, ${alpha})`;
        ctx.fillRect(0, 0, w, h);
    }

    function drawMinimap(ctx, phases, currentPhase, gameWidth) {
        const mmX = gameWidth - 90;
        const mmY = 100;
        const mmW = 80;
        const mmH = 50;

        ctx.fillStyle = "rgba(8, 6, 18, 0.8)";
        ctx.beginPath();
        ctx.roundRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8, 6);
        ctx.fill();

        const phasePositions = {
            floresta_arcana: { x: 0, label: "F" },
            ruinas_antigas: { x: 1, label: "R" },
            entrada_masmorra: { x: 2, label: "M" },
        };

        const cellW = 22;
        const cellH = 30;
        const offsetX = mmX + 4;
        const offsetY = mmY + 8;

        for (const [key, pos] of Object.entries(phasePositions)) {
            const rx = offsetX + pos.x * (cellW + 4);
            const ry = offsetY;
            ctx.fillStyle = key === currentPhase ? "#c9a84c" : "#333";
            ctx.fillRect(rx, ry, cellW, cellH);
            ctx.fillStyle = key === currentPhase ? "#fff" : "#888";
            ctx.font = "10px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(pos.label, rx + cellW / 2, ry + cellH / 2 + 4);
            ctx.textAlign = "start";
        }
    }

    return {
        ctx, clear, drawRoom, drawObject, drawNPC, drawHUD,
        drawTransition, drawMinimap, width, height,
        ensureAssets, tileLoader, mapManager,
    };
}
