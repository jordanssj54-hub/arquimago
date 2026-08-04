import { TILE, isSolid } from "./world.js";
import { createAssetLoader } from "./AssetLoader.js";
import { createSprite } from "./Sprite.js";
import { createAnimation } from "./Animation.js";

const SPEED = 110;
const ANIM_SPEED = 0.10;
const DEFAULT_FRAME = 32;
const SCALE = 2;

const DIRECTION_KEYS = ["down", "left", "right", "up"];

let playerAssetLoader = null;
let assetsReady = false;
let sprites = {};
let anim = null;

function ensurePlayerAssets() {
    if (playerAssetLoader) return Promise.resolve();
    playerAssetLoader = createAssetLoader();
    return playerAssetLoader.load().then(() => {
        for (const dir of DIRECTION_KEYS) {
            const img = playerAssetLoader.getSpriteImage(dir);
            const meta = playerAssetLoader.getSpriteMeta(dir);
            if (img) {
                const fw = meta ? meta.frameW : DEFAULT_FRAME;
                const fh = meta ? meta.frameH : DEFAULT_FRAME;
                const cols = meta ? meta.cols : 1;
                sprites[dir] = createSprite(img, fw, fh, cols);
                console.log("[Player] Sprite created:", dir,
                    "→ frame:", fw + "x" + fh,
                    ", cols:", cols);
            }
        }
        anim = createAnimation(ANIM_SPEED);
        assetsReady = true;
    }).catch(() => {
        assetsReady = true;
    });
}

ensurePlayerAssets();

export function createPlayer(x, y) {
    return {
        x: x * TILE + TILE / 2,
        y: y * TILE + TILE / 2,
        vx: 0, vy: 0,
        dir: "down",
        speed: SPEED,
        moving: false,
        stepTimer: 0,
        width: 24, height: 32,
    };
}

function isBlocked(px, py, hw, hh, room) {
    const corners = [
        { x: px - hw, y: py - hh },
        { x: px + hw, y: py - hh },
        { x: px - hw, y: py + hh },
        { x: px + hw, y: py + hh },
    ];
    for (const c of corners) {
        const tx = Math.floor(c.x / TILE);
        const ty = Math.floor(c.y / TILE);
        if (tx < 0 || ty < 0 || tx >= room.width || ty >= room.height) return true;
        if (isSolid(room.tileMap[ty][tx])) return true;
    }
    return false;
}

export function updatePlayer(p, input, dt, room, onStep) {
    let dx = 0, dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    p.moving = dx !== 0 || dy !== 0;

    if (dx !== 0 || dy !== 0) {
        if (Math.abs(dx) > Math.abs(dy)) p.dir = dx > 0 ? "right" : "left";
        else p.dir = dy > 0 ? "down" : "up";
    }

    if (anim) {
        if (!p.moving) {
            anim.setState("idle_" + p.dir);
        } else {
            anim.setState("walk_" + p.dir);
        }
    }

    const nx = p.x + dx * p.speed * dt;
    const ny = p.y + dy * p.speed * dt;

    const hw = p.width / 2;
    const hh = p.height / 2;

    if (!isBlocked(nx, p.y, hw, hh, room)) p.x = nx;
    if (!isBlocked(p.x, ny, hw, hh, room)) p.y = ny;

    if (anim) anim.update(dt);

    if (dx !== 0 || dy !== 0) {
        p.stepTimer += dt;
        if (p.stepTimer > 0.3) {
            p.stepTimer = 0;
            if (onStep) onStep();
        }
    }
}

export function drawPlayer(ctx, p, camX, camY, time) {
    const sx = Math.floor(p.x - camX);
    const sy = Math.floor(p.y - camY);
    const frameIndex = anim ? anim.getSpriteFrame() : 0;

    const sprite = sprites[p.dir];
    if (sprite && assetsReady) {
        sprite.draw(ctx, sx, sy, frameIndex);
    }

    ctx.globalAlpha = 1;
}
