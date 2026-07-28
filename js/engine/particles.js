export function createParticleSystem() {
    const particles = [];

    function emit(x, y, color, count, opts) {
        const o = opts || {};
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * (o.spread || 80),
                vy: (Math.random() - 0.5) * (o.spread || 80) - (o.upward || 0),
                life: o.life || 0.6 + Math.random() * 0.4,
                maxLife: o.life || 0.6 + Math.random() * 0.4,
                size: o.size || 2 + Math.random() * 2,
                color,
                gravity: o.gravity || 0,
            });
        }
    }

    function emitTrail(x, y, color) {
        particles.push({
            x: x + (Math.random() - 0.5) * 6,
            y: y + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 10,
            vy: -10 - Math.random() * 15,
            life: 0.4 + Math.random() * 0.3,
            maxLife: 0.4 + Math.random() * 0.3,
            size: 1.5 + Math.random() * 1.5,
            color,
            gravity: -20,
        });
    }

    function emitBurst(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 40 + Math.random() * 60;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.5 + Math.random() * 0.3,
                maxLife: 0.5 + Math.random() * 0.3,
                size: 2 + Math.random() * 2,
                color,
                gravity: 0,
            });
        }
    }

    function emitMagic(x, y, color) {
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const speed = 20 + Math.random() * 40;
            particles.push({
                x: x + Math.cos(angle) * 15,
                y: y + Math.sin(angle) * 15,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.8 + Math.random() * 0.4,
                maxLife: 0.8 + Math.random() * 0.4,
                size: 2 + Math.random() * 3,
                color,
                gravity: 0,
            });
        }
    }

    function update(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.gravity * dt;
            p.life -= dt;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function draw(ctx, camX, camY) {
        for (const p of particles) {
            const alpha = Math.max(0, p.life / p.maxLife);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x - camX, p.y - camY, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function clear() { particles.length = 0; }

    return { emit, emitTrail, emitBurst, emitMagic, update, draw, clear };
}
