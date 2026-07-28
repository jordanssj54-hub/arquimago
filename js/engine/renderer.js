/**
 * renderer.js
 * Viewport-clamped tilemap and player rendering using dynamic asset dimensions.
 * Uses AssetLoader + MapManager for tileset processing and ID validation.
 * Camera positions are Math.floor()-ed to prevent pixel bleeding.
 */

import { TILE, T } from "./world.js";
import { createAssetLoader } from "./AssetLoader.js";
import { createMapManager } from "./MapManager.js";

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
        this.lineTo(x, y + r);
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
        case T.GRASS:
        case T.TALL_GRASS:
            generateGrassProcedural(ctx, sx, sy, tw, th, tx, ty);
            break;
        case T.TREE:
            generateTreeProcedural(ctx, sx, sy, tw, th);
            break;
        case T.ROCK:
            generateRockProcedural(ctx, sx, sy, tw, th);
            break;
        case T.WATER:
            generateWaterProcedural(ctx, sx, sy, tw, th, tx, ty, time);
            break;
        case T.BUSH:
            generateBushProcedural(ctx, sx, sy, tw, th);
            break;
        case T.BOOKSHELF:
            generateBookshelfProcedural(ctx, sx, sy, tw, th);
            break;
        case T.PILLAR:
            generatePillarProcedural(ctx, sx, sy, tw, th);
            break;
        case T.WALL:
            generateWallProcedural(ctx, sx, sy, tw, th, false);
            break;
        case T.DARK_WALL:
            generateWallProcedural(ctx, sx, sy, tw, th, true);
            break;
        case T.RUIN:
            generateRuinProcedural(ctx, sx, sy, tw, th);
            break;
        case T.CRYSTAL_FLOOR:
            generateCrystalFloorProcedural(ctx, sx, sy, tw, th, tx, ty, time);
            break;
        default:
            generateGrassProcedural(ctx, sx, sy, tw, th, tx, ty);
            break;
    }
}

export function createRenderer(canvas, width, height) {
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;

    const assetLoader = createAssetLoader();
    const mapManager = createMapManager();
    let assetsReady = false;
    let loadPromise = null;

    function ensureAssets() {
        if (assetsReady) return Promise.resolve();
        if (loadPromise) return loadPromise;
        loadPromise = assetLoader.load().then(() => {
            const meta = assetLoader.getTilesetMeta();
            if (meta) {
                mapManager.invalidateCache();
            }
            assetsReady = true;
        }).catch(() => {
            assetsReady = true;
        });
        return loadPromise;
    }

    ensureAssets();

    function resize(containerW, containerH) {
        const scale = Math.min(containerW / width, containerH / height);
        canvas.style.width = (width * scale) + "px";
        canvas.style.height = (height * scale) + "px";
    }

    function clear(color) {
        ctx.fillStyle = color || "#050508";
        ctx.fillRect(0, 0, width, height);
    }

    function drawRoom(room, camX, camY, time) {
        const tw = assetLoader.getTileSize();
        const th = tw;
        const tilesetCols = assetLoader.getTilesetCols();
        const tilesetRows = assetLoader.getTilesetRows();
        const tilesetImg = assetLoader.getTilesetImage();

        const camIX = Math.floor(camX);
        const camIY = Math.floor(camY);

        const { startTX, startTY, endTX, endTY } = mapManager.getVisibleTiles(
            camIX, camIY, width, height, room.width, room.height, tw
        );

        for (let ty = startTY; ty <= endTY; ty++) {
            for (let tx = startTX; tx <= endTX; tx++) {
                if (ty < 0 || ty >= room.height || tx < 0 || tx >= room.width) continue;

                const rawTile = room.tileMap[ty][tx];
                const tile = mapManager.validateTileId(rawTile, tilesetCols, tilesetRows);

                const sx = tx * tw - camIX;
                const sy = ty * th - camIY;

                const pos = mapManager.getTilePosition(tile, tilesetCols, tilesetRows);
                const canTileset = assetsReady && assetLoader.isTilesetReady() && tilesetImg && pos !== null;

                if (canTileset) {
                    const srcSX = pos.col * tw;
                    const srcSY = pos.row * th;

                    if (srcSX + tw <= tilesetImg.naturalWidth && srcSY + th <= tilesetImg.naturalHeight) {
                        ctx.drawImage(
                            tilesetImg,
                            srcSX, srcSY, tw, th,
                            Math.floor(sx), Math.floor(sy), tw, th
                        );
                        continue;
                    }
                }

                drawProceduralTile(ctx, tile, Math.floor(sx), Math.floor(sy), tw, th, tx, ty, time);
            }
        }
    }

    function drawObject(ctx, obj, camX, camY, time) {
        const tw = assetLoader.getTileSize();
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
            const tw2 = assetLoader.getTileSize();
            ctx.fillStyle = obj.locked ? "#3a3a3a" : "#1a1a1a";
            ctx.fillRect(obj.x * tw2 + 2, obj.y * tw2, tw2 - 4, tw2);
            if (obj.locked) {
                ctx.fillStyle = "#cc4444";
                ctx.beginPath();
                ctx.arc(sx, sy, 4, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = "rgba(100,200,100,0.2)";
                ctx.fillRect(obj.x * tw2 + 2, obj.y * tw2, tw2 - 4, tw2);
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
            const tw3 = assetLoader.getTileSize();
            ctx.fillStyle = "#4a3020";
            ctx.fillRect(obj.x * tw3 + 1, obj.y * tw3 + 2, tw3 - 2, tw3 - 2);
            ctx.fillStyle = "#2a1a0a";
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(obj.x * tw3 + 3, obj.y * tw3 + 4 + i * 9, tw3 - 6, 2);
            }
        }
    }

    function drawNPC(ctx, npc, camX, camY, time) {
        const tw = assetLoader.getTileSize();
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
        ctx.roundRect(pad, pad, 180, 72, 8);
        ctx.fill();

        ctx.fillStyle = "#888";
        ctx.font = "9px Inter, sans-serif";
        ctx.fillText("HP", pad + 8, pad + 14);
        ctx.fillStyle = "#333";
        ctx.fillRect(pad + 28, pad + 6, barW, barH);
        ctx.fillStyle = "#cc4444";
        ctx.fillRect(pad + 28, pad + 6, barW * (player.hp / player.maxHp), barH);

        ctx.fillStyle = "#888";
        ctx.fillText("MP", pad + 8, pad + 30);
        ctx.fillStyle = "#333";
        ctx.fillRect(pad + 28, pad + 22, barW, barH);
        ctx.fillStyle = "#4488cc";
        ctx.fillRect(pad + 28, pad + 22, barW * (player.mana / player.maxMana), barH);

        ctx.fillStyle = "#c9a84c";
        ctx.font = "9px Inter, sans-serif";
        ctx.fillText("LV " + player.level, pad + 8, pad + 48);
        ctx.fillStyle = "#333";
        ctx.fillRect(pad + 36, pad + 40, barW - 10, barH);
        ctx.fillStyle = "#44cc44";
        const xpNeeded = 50 + player.level * 30;
        ctx.fillRect(pad + 36, pad + 40, (barW - 10) * (player.xp / xpNeeded), barH);

        const fragCount = gameState.memoryFragments ? gameState.memoryFragments.length : 0;
        ctx.fillStyle = "#c9a84c";
        ctx.font = "9px Inter, sans-serif";
        ctx.fillText("\u2B50 " + fragCount + "/8", pad + 8, pad + 64);

        if (gameState.currentRoom) {
            ctx.fillStyle = "rgba(8, 6, 18, 0.7)";
            ctx.beginPath();
            ctx.roundRect(gameWidth - 130, pad, 120, 22, 6);
            ctx.fill();
            ctx.fillStyle = "#c9a84c";
            ctx.font = "10px Inter, sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(gameState.roomName || "", gameWidth - pad - 8, pad + 15);
            ctx.textAlign = "start";
        }

        ctx.fillStyle = "rgba(8, 6, 18, 0.7)";
        ctx.beginPath();
        ctx.roundRect(gameWidth - 130, pad + 28, 120, 16, 6);
        ctx.fill();
        ctx.fillStyle = "#888";
        ctx.font = "9px Inter, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("E: Ação  K: Magia  WASD: Mover", gameWidth - pad - 8, pad + 40);
        ctx.textAlign = "start";
    }

    function drawTransition(ctx, alpha, w, h) {
        if (alpha <= 0) return;
        ctx.fillStyle = `rgba(5, 5, 8, ${alpha})`;
        ctx.fillRect(0, 0, w, h);
    }

    function drawMinimap(ctx, rooms, currentRoom, playerX, playerY, gameWidth) {
        const tw = assetLoader.getTileSize();
        const mmX = gameWidth - 90;
        const mmY = 100;
        const mmW = 80;
        const mmH = 60;

        ctx.fillStyle = "rgba(8, 6, 18, 0.8)";
        ctx.beginPath();
        ctx.roundRect(mmX - 4, mmY - 4, mmW + 8, mmH + 8, 6);
        ctx.fill();

        const roomPositions = {
            forest_clearing: { x: 0, y: 1 },
            whispering_woods: { x: 1, y: 1 },
            crystal_grotto: { x: 1, y: 2 },
            ruins_of_asterion: { x: 2, y: 1 },
            old_library: { x: 2, y: 2 },
            shadow_temple: { x: 3, y: 1 },
        };

        const cellW = 16;
        const cellH = 16;
        const offsetX = mmX + 4;
        const offsetY = mmY + 4;

        for (const [key, pos] of Object.entries(roomPositions)) {
            const rx = offsetX + pos.x * (cellW + 4);
            const ry = offsetY + pos.y * (cellH + 4);
            ctx.fillStyle = key === currentRoom ? "#c9a84c" : "#333";
            ctx.fillRect(rx, ry, cellW, cellH);
            if (key === currentRoom) {
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(rx + cellW / 2, ry + cellH / 2, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    return {
        ctx, clear, drawRoom, drawObject, drawNPC, drawHUD,
        drawTransition, drawMinimap, resize, width, height,
        ensureAssets, assetLoader, mapManager,
    };
}
