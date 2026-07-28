import { TILE, isSolid } from "./world.js";

const TYPES = {
    slime: {
        hp: 30, speed: 30, damage: 8, xp: 15, color: "#44cc44",
        size: 10, attackRange: 24, attackCooldown: 1.2,
    },
    shadow_wisp: {
        hp: 20, speed: 50, damage: 10, xp: 20, color: "#8844cc",
        size: 8, attackRange: 28, attackCooldown: 0.9,
    },
    crystal_golem: {
        hp: 60, speed: 20, damage: 15, xp: 35, color: "#44cccc",
        size: 14, attackRange: 30, attackCooldown: 1.5,
    },
    stone_guardian: {
        hp: 80, speed: 15, damage: 18, xp: 45, color: "#8a7a5a",
        size: 16, attackRange: 32, attackCooldown: 1.8,
    },
    shadow_wraith: {
        hp: 150, speed: 40, damage: 22, xp: 100, color: "#aa22aa",
        size: 20, attackRange: 36, attackCooldown: 1.0, isBoss: true,
    },
};

export function createEnemy(def) {
    const t = TYPES[def.type] || TYPES.slime;
    return {
        type: def.type,
        id: def.id,
        x: def.x * TILE + TILE / 2,
        y: def.y * TILE + TILE / 2,
        hp: t.hp, maxHp: t.hp,
        speed: t.speed,
        damage: t.damage,
        xp: t.xp,
        color: t.color,
        size: t.size,
        attackRange: t.attackRange,
        attackCooldown: t.attackCooldown,
        currentCooldown: 0,
        alive: true,
        hitFlash: 0,
        stunTimer: 0,
        isBoss: t.isBoss || false,
        patrolDir: Math.random() > 0.5 ? 1 : -1,
        patrolTimer: 0,
        aggroRange: 160,
    };
}

export function updateEnemy(e, playerX, playerY, dt, room) {
    if (!e.alive) return;

    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.stunTimer > 0) { e.stunTimer -= dt; return; }
    if (e.currentCooldown > 0) e.currentCooldown -= dt;

    const dx = playerX - e.x;
    const dy = playerY - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < e.aggroRange) {
        const nx = dx / dist;
        const ny = dy / dist;
        const newX = e.x + nx * e.speed * dt;
        const newY = e.y + ny * e.speed * dt;

        const hw = e.size;
        const tx = Math.floor(newX / TILE);
        const ty = Math.floor(newY / TILE);
        if (tx >= 0 && ty >= 0 && tx < room.width && ty < room.height && !isSolid(room.tileMap[ty][tx])) {
            e.x = newX;
        }
        const tx2 = Math.floor(e.x / TILE);
        const ty2 = Math.floor(newY / TILE);
        if (tx2 >= 0 && ty2 >= 0 && tx2 < room.width && ty2 < room.height && !isSolid(room.tileMap[ty2][tx2])) {
            e.y = newY;
        }
    } else {
        e.patrolTimer += dt;
        if (e.patrolTimer > 2) {
            e.patrolTimer = 0;
            e.patrolDir *= -1;
        }
        const px = e.x + e.patrolDir * e.speed * 0.3 * dt;
        const ptx = Math.floor(px / TILE);
        const pty = Math.floor(e.y / TILE);
        if (ptx >= 0 && pty >= 0 && ptx < room.width && pty < room.height && !isSolid(room.tileMap[pty][ptx])) {
            e.x = px;
        } else {
            e.patrolDir *= -1;
        }
    }

    return dist < e.attackRange && e.currentCooldown <= 0;
}

export function hitEnemy(e, damage, stunDuration) {
    if (!e.alive) return false;
    e.hp -= damage;
    e.hitFlash = 0.2;
    e.stunTimer = stunDuration || 0.15;
    if (e.hp <= 0) {
        e.alive = false;
        return true;
    }
    return false;
}

export function getEnemyAttack(e, playerX, playerY) {
    if (!e.alive || e.currentCooldown > 0) return false;
    const dx = playerX - e.x;
    const dy = playerY - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < e.attackRange) {
        e.currentCooldown = e.attackCooldown;
        return e.damage;
    }
    return false;
}

export function drawEnemy(ctx, e, camX, camY, time) {
    if (!e.alive) return;

    const sx = e.x - camX;
    const sy = e.y - camY;

    if (e.hitFlash > 0 && Math.floor(time * 20) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }

    if (e.type === "slime") {
        const bounce = Math.sin(time * 4) * 2;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.ellipse(sx, sy + bounce, e.size, e.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(sx - 3, sy - 3 + bounce, 2, 0, Math.PI * 2);
        ctx.arc(sx + 3, sy - 3 + bounce, 2, 0, Math.PI * 2);
        ctx.fill();
    } else if (e.type === "shadow_wisp") {
        const pulse = Math.sin(time * 6) * 3;
        ctx.globalAlpha = 0.4 + Math.sin(time * 3) * 0.2;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(sx, sy, e.size + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
    } else if (e.type === "crystal_golem") {
        ctx.fillStyle = e.color;
        ctx.fillRect(sx - e.size, sy - e.size, e.size * 2, e.size * 2);
        ctx.fillStyle = "#88ffff";
        ctx.fillRect(sx - 4, sy - 4, 8, 8);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(sx - 4, sy - 4, 2, 0, Math.PI * 2);
        ctx.arc(sx + 4, sy - 4, 2, 0, Math.PI * 2);
        ctx.fill();
    } else if (e.type === "stone_guardian") {
        ctx.fillStyle = e.color;
        ctx.fillRect(sx - e.size, sy - e.size * 1.2, e.size * 2, e.size * 2.4);
        ctx.fillStyle = "#ffcc44";
        ctx.beginPath();
        ctx.arc(sx - 5, sy - e.size * 0.5, 3, 0, Math.PI * 2);
        ctx.arc(sx + 5, sy - e.size * 0.5, 3, 0, Math.PI * 2);
        ctx.fill();
    } else if (e.type === "shadow_wraith") {
        const pulse = Math.sin(time * 5) * 4;
        ctx.fillStyle = "rgba(100, 0, 100, 0.3)";
        ctx.beginPath();
        ctx.arc(sx, sy, e.size + pulse + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(sx, sy, e.size + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff44ff";
        ctx.beginPath();
        ctx.arc(sx - 6, sy - 4, 4, 0, Math.PI * 2);
        ctx.arc(sx + 6, sy - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(sx - 6, sy - 4, 2, 0, Math.PI * 2);
        ctx.arc(sx + 6, sy - 4, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    if (e.isBoss && e.alive) {
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(sx - 20, sy - e.size - 16, 40, 4);
        ctx.fillStyle = "#ff8888";
        ctx.fillRect(sx - 20, sy - e.size - 16, 40 * (e.hp / e.maxHp), 4);
    }

    ctx.globalAlpha = 1;
}
