/**
 * player.js
 * Sprite animation logic with preserved physics/collisions.
 * Auto-calculates frame dimensions from spritesheet.
 * Pivot aligned to bottom-center (feet position) of frame.
 */

import { TILE, isSolid } from "./world.js";
import { createAssetLoader } from "./AssetLoader.js";

const SPEED = 120;
const MAGIC_COST = 15;
const MAGIC_DAMAGE = 25;
const ATTACK_DAMAGE = 12;
const ATTACK_RANGE = 38;
const ATTACK_COOLDOWN = 0.35;
const MAGIC_COOLDOWN = 0.6;
const INVINCIBLE_TIME = 0.8;

const ANIM_SPEED = 0.12;

let playerAssetLoader = null;
let playerAssetsReady = false;

function ensurePlayerAssets() {
    if (playerAssetLoader) return Promise.resolve();
    playerAssetLoader = createAssetLoader();
    return playerAssetLoader.load().then(() => {
        playerAssetsReady = true;
    }).catch(() => {
        playerAssetsReady = true;
    });
}

ensurePlayerAssets();

export function createPlayer(x, y) {
    return {
        x: x * TILE + TILE / 2,
        y: y * TILE + TILE / 2,
        vx: 0, vy: 0,
        dir: "down",
        hp: 100, maxHp: 100,
        mana: 100, maxMana: 100,
        xp: 0, level: 1,
        speed: SPEED,
        attacking: false,
        attackTimer: 0,
        attackCooldown: 0,
        casting: false,
        castTimer: 0,
        castCooldown: 0,
        invincible: 0,
        hitFlash: 0,
        stepTimer: 0,
        alive: true,
        width: 24, height: 32,
        animTimer: 0,
        animFrame: 0,
        moving: false,
    };
}

export function updatePlayer(p, input, dt, room, onStep) {
    if (!p.alive) return;

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

    const nx = p.x + dx * p.speed * dt;
    const ny = p.y + dy * p.speed * dt;

    const hw = p.width / 2;
    const hh = p.height / 2;

    if (!isBlocked(nx, p.y, hw, hh, room)) p.x = nx;
    if (!isBlocked(p.x, ny, hw, hh, room)) p.y = ny;

    if (p.moving) {
        p.animTimer += dt;
        if (p.animTimer >= ANIM_SPEED) {
            p.animTimer -= ANIM_SPEED;
            p.animFrame = (p.animFrame + 1) % 4;
        }
    } else {
        p.animTimer = 0;
        p.animFrame = 0;
    }

    if (dx !== 0 || dy !== 0) {
        p.stepTimer += dt;
        if (p.stepTimer > 0.3) {
            p.stepTimer = 0;
            if (onStep) onStep();
        }
    }

    if (p.attackCooldown > 0) p.attackCooldown -= dt;
    if (p.castCooldown > 0) p.castCooldown -= dt;
    if (p.invincible > 0) p.invincible -= dt;
    if (p.hitFlash > 0) p.hitFlash -= dt;

    if (p.attacking) {
        p.attackTimer -= dt;
        if (p.attackTimer <= 0) p.attacking = false;
    }
    if (p.casting) {
        p.castTimer -= dt;
        if (p.castTimer <= 0) p.casting = false;
    }
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

export function playerAttack(p) {
    if (p.attackCooldown > 0 || p.attacking || !p.alive) return false;
    p.attacking = true;
    p.attackTimer = 0.2;
    p.attackCooldown = ATTACK_COOLDOWN;
    return true;
}

export function playerCastMagic(p) {
    if (p.castCooldown > 0 || p.casting || p.mana < MAGIC_COST || !p.alive) return false;
    p.casting = true;
    p.castTimer = 0.3;
    p.castCooldown = MAGIC_COOLDOWN;
    p.mana -= MAGIC_COST;
    return true;
}

export function getAttackHitbox(p) {
    const offsets = {
        up: { x: 0, y: -ATTACK_RANGE },
        down: { x: 0, y: ATTACK_RANGE },
        left: { x: -ATTACK_RANGE, y: 0 },
        right: { x: ATTACK_RANGE, y: 0 },
    };
    const o = offsets[p.dir];
    return { x: p.x + o.x, y: p.y + o.y, r: 16 };
}

export function getMagicHitbox(p) {
    const offsets = {
        up: { x: 0, y: -80 },
        down: { x: 0, y: 80 },
        left: { x: -80, y: 0 },
        right: { x: 80, y: 0 },
    };
    const o = offsets[p.dir];
    return { x: p.x + o.x, y: p.y + o.y, r: 24 };
}

export function damagePlayer(p, amount) {
    if (p.invincible > 0 || !p.alive) return false;
    p.hp = Math.max(0, p.hp - amount);
    p.invincible = INVINCIBLE_TIME;
    p.hitFlash = 0.3;
    if (p.hp <= 0) p.alive = false;
    return true;
}

export function healPlayer(p, amount) {
    p.hp = Math.min(p.maxHp, p.hp + amount);
}

export function restoreMana(p, amount) {
    p.mana = Math.min(p.maxMana, p.mana + amount);
}

export function addXP(p, amount) {
    p.xp += amount;
    const needed = 50 + p.level * 30;
    if (p.xp >= needed) {
        p.xp -= needed;
        p.level += 1;
        p.maxHp += 10;
        p.hp = p.maxHp;
        p.maxMana += 5;
        p.mana = p.maxMana;
        return true;
    }
    return false;
}

function drawFallbackCharacter(ctx, sx, sy, dir, time) {
    ctx.fillStyle = "#2a1a3a";
    ctx.fillRect(sx - 8, sy - 4, 16, 14);

    ctx.fillStyle = "#c9a84c";
    ctx.fillRect(sx - 6, sy + 10, 5, 6);
    ctx.fillRect(sx + 1, sy + 10, 5, 6);

    ctx.fillStyle = "#e8cc7a";
    ctx.beginPath();
    ctx.arc(sx, sy - 6, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a0a2a";
    const eyeOffsets = {
        down: [{ x: -3, y: -5 }, { x: 3, y: -5 }],
        up: [{ x: -3, y: -7 }, { x: 3, y: -7 }],
        left: [{ x: -5, y: -5 }, { x: -1, y: -5 }],
        right: [{ x: 1, y: -5 }, { x: 5, y: -5 }],
    };
    const eyes = eyeOffsets[dir];
    eyes.forEach(e => {
        ctx.beginPath();
        ctx.arc(sx + e.x, sy + e.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = "#4a3080";
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy - 10);
    ctx.lineTo(sx, sy - 18);
    ctx.lineTo(sx + 8, sy - 10);
    ctx.closePath();
    ctx.fill();
}

export function drawPlayer(ctx, p, camX, camY, time) {
    const sx = Math.floor(p.x - camX);
    const sy = Math.floor(p.y - camY);

    if (p.hitFlash > 0 && Math.floor(time * 20) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    if (p.invincible > 0 && Math.floor(time * 10) % 2 === 0) {
        ctx.globalAlpha = 0.6;
    }

    if (playerAssetsReady && playerAssetLoader && playerAssetLoader.isSpritesheetReady()) {
        const spriteImg = playerAssetLoader.getSpriteImage();
        const frameMeta = playerAssetLoader.getSpriteFrame(p.dir, p.moving ? p.animFrame : 0);

        if (spriteImg && frameMeta) {
            const drawW = frameMeta.sw;
            const drawH = frameMeta.sh;

            const pivotX = drawW / 2;
            const pivotY = drawH;

            ctx.drawImage(
                spriteImg,
                frameMeta.sx, frameMeta.sy, frameMeta.sw, frameMeta.sh,
                Math.floor(sx - pivotX), Math.floor(sy - pivotY), drawW, drawH
            );
        } else {
            drawFallbackCharacter(ctx, sx, sy, p.dir, time);
        }
    } else {
        drawFallbackCharacter(ctx, sx, sy, p.dir, time);
    }

    if (p.attacking) {
        ctx.save();
        ctx.translate(sx, sy);
        const angles = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };
        ctx.rotate(angles[p.dir]);
        ctx.strokeStyle = "#e8cc7a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 14, -0.4, 0.4);
        ctx.stroke();
        ctx.restore();
    }

    if (p.casting) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        const pulse = Math.sin(time * 15) * 4;
        ctx.strokeStyle = "#7b68ee";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 16 + pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    ctx.globalAlpha = 1;
}
