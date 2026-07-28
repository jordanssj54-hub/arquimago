(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    var W, H, engine, trees, ruins, crystals, stars;

    function rand(min, max) { return min + Math.random() * (max - min); }

    function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function clamp(v, mn, mx) { return v < mn ? mn : v > mx ? mx : v; }

    function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    function drawSky(ctx) {
        var grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#050510');
        grad.addColorStop(0.2, '#080818');
        grad.addColorStop(0.5, '#0f0a18');
        grad.addColorStop(0.8, '#08080f');
        grad.addColorStop(1, '#030308');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H * 0.6);
    }

    function drawGround(ctx) {
        var grad = ctx.createLinearGradient(0, H * 0.6, 0, H);
        grad.addColorStop(0, '#08080f');
        grad.addColorStop(0.3, '#06060c');
        grad.addColorStop(1, '#020204');
        ctx.fillStyle = grad;
        ctx.fillRect(0, H * 0.6, W, H * 0.4);
    }

    function drawStars(ctx, camera) {
        var baseAlpha = 0.15 + Math.sin(Date.now() / 4000) * 0.05;
        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            var sx = s.x - camera.x * s.depth * 0.02;
            var sy = s.y - camera.y * s.depth * 0.02;
            if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;
            ctx.save();
            ctx.globalAlpha = baseAlpha * s.brightness;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawTree(ctx, x, baseY, height, width, depth, camera) {
        var cx = x - camera.x * (0.1 + depth * 0.3);
        var cy = baseY - camera.y * (0.05 + depth * 0.15);
        if (cx < -100 || cx > W + 100) return;
        var alpha = 0.3 + depth * 0.4;
        var trunkColor = depth > 0.5 ? '#0a0a12' : '#0d0d18';
        var canopyColor = depth > 0.5 ? '#06060e' : '#090915';
        ctx.save();
        ctx.globalAlpha = alpha;
        var tw = width * 0.12;
        ctx.fillStyle = trunkColor;
        ctx.fillRect(cx - tw / 2, cy - height * 0.6, tw, height * 0.6);
        ctx.fillStyle = canopyColor;
        var r1 = width * 0.25;
        var r2 = width * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy - height * 0.7, r1, 0, Math.PI * 2);
        ctx.arc(cx - width * 0.15, cy - height * 0.55, r2, 0, Math.PI * 2);
        ctx.arc(cx + width * 0.15, cy - height * 0.55, r2, 0, Math.PI * 2);
        ctx.arc(cx, cy - height * 0.4, r1 * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawRuinColumn(ctx, x, baseY, height, brokenLevel, depth, camera) {
        var cx = x - camera.x * (0.05 + depth * 0.2);
        var cy = baseY - camera.y * (0.05 + depth * 0.1);
        if (cx < -50 || cx > W + 50) return;
        var alpha = 0.4 + depth * 0.3;
        ctx.save();
        ctx.globalAlpha = alpha;
        var w = 6 + depth * 4;
        var topY = cy - height * (0.4 + brokenLevel * 0.3);
        ctx.fillStyle = '#12121f';
        ctx.fillRect(cx - w, topY, w * 2, cy - topY);
        if (brokenLevel > 0.3) {
            ctx.fillStyle = '#151525';
            ctx.beginPath();
            ctx.moveTo(cx - w, topY);
            ctx.lineTo(cx - w * 0.4, topY - 4);
            ctx.lineTo(cx + w * 0.2, topY + 2);
            ctx.lineTo(cx + w * 0.6, topY - 3);
            ctx.lineTo(cx + w, topY + 1);
            ctx.fill();
        } else {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(cx - w - 1, topY - 3, w * 2 + 2, 4);
        }
        ctx.restore();
    }

    function drawCrystal(ctx, x, y, size, hue, glow, camera) {
        var cx = x - camera.x * 0.15;
        var cy = y - camera.y * 0.1;
        if (cx < -30 || cx > W + 30) return;
        ctx.save();
        var alpha = 0.5 + glow * 0.5;
        ctx.globalAlpha = alpha;
        var color = hue === 'blue' ? '74, 127, 212' : hue === 'gold' ? '201, 168, 76' : '150, 100, 200';
        ctx.shadowBlur = 15 + glow * 15;
        ctx.shadowColor = 'rgba(' + color + ', ' + (0.3 + glow * 0.4) + ')';
        ctx.fillStyle = 'rgba(' + color + ', ' + (0.2 + glow * 0.3) + ')';
        ctx.strokeStyle = 'rgba(' + color + ', ' + (0.4 + glow * 0.4) + ')';
        ctx.lineWidth = 1;
        var hw = size * 0.5;
        var hh = size;
        ctx.beginPath();
        ctx.moveTo(cx, cy - hh);
        ctx.lineTo(cx + hw, cy);
        ctx.lineTo(cx + hw * 0.3, cy + hh * 0.3);
        ctx.lineTo(cx, cy + hh * 0.5);
        ctx.lineTo(cx - hw * 0.3, cy + hh * 0.3);
        ctx.lineTo(cx - hw, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    function drawMist(ctx, camera, time) {
        ctx.save();
        for (var i = 0; i < 8; i++) {
            var mx = (i * W * 0.15 + Math.sin(time * 0.1 + i) * 60) - camera.x * 0.05;
            var my = H * 0.5 + Math.sin(time * 0.05 + i * 2) * 30 + i * 20 - camera.y * 0.03;
            var mw = 120 + Math.sin(time * 0.08 + i) * 40;
            var mh = 30 + Math.sin(time * 0.06 + i * 1.5) * 10;
            var grad = ctx.createRadialGradient(mx, my, 0, mx, my, mw);
            grad.addColorStop(0, 'rgba(150, 170, 220, 0.04)');
            grad.addColorStop(0.5, 'rgba(150, 170, 220, 0.02)');
            grad.addColorStop(1, 'rgba(150, 170, 220, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(mx, my, mw, mh, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function drawArchmageKneeling(ctx, x, y, scale, staffGlow) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        var glowA = 0.2 + staffGlow * 0.8;

        ctx.fillStyle = '#0d0d18';
        ctx.beginPath();
        ctx.ellipse(0, 10, 18, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#111120';
        ctx.beginPath();
        ctx.moveTo(-20, -10);
        ctx.quadraticCurveTo(-28, 20, -22, 40);
        ctx.lineTo(22, 40);
        ctx.quadraticCurveTo(28, 20, 20, -10);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0a0a15';
        ctx.beginPath();
        ctx.arc(0, -22, 14, Math.PI, 0);
        ctx.lineTo(10, -12);
        ctx.quadraticCurveTo(0, -8, -10, -12);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(74, 127, 212, ' + glowA + ')';
        ctx.shadowBlur = 8 * staffGlow;
        ctx.shadowColor = 'rgba(74, 127, 212, ' + (0.3 * staffGlow) + ')';
        ctx.beginPath();
        ctx.arc(-4, -24, 1.5, 0, Math.PI * 2);
        ctx.arc(4, -24, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        var staffX = 16;
        var staffY = -15;
        ctx.save();
        ctx.translate(staffX, staffY);
        ctx.rotate(0.4);
        ctx.strokeStyle = '#5a4a2a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 55);
        ctx.stroke();
        ctx.fillStyle = 'rgba(74, 127, 212, ' + glowA + ')';
        ctx.shadowBlur = 12 * staffGlow;
        ctx.shadowColor = 'rgba(74, 127, 212, ' + (0.4 * staffGlow) + ')';
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(-4, 2);
        ctx.lineTo(0, 7);
        ctx.lineTo(4, 2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        ctx.restore();
    }

    function drawArchmageStanding(ctx, x, y, scale, staffGlow) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        var glowA = 0.3 + staffGlow * 0.7;

        ctx.fillStyle = '#0f0f1c';
        ctx.beginPath();
        ctx.moveTo(-22, -25);
        ctx.quadraticCurveTo(-32, 10, -28, 50);
        ctx.lineTo(28, 50);
        ctx.quadraticCurveTo(32, 10, 22, -25);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0c0c18';
        ctx.beginPath();
        ctx.arc(0, -32, 15, Math.PI, 0);
        ctx.lineTo(11, -22);
        ctx.quadraticCurveTo(0, -17, -11, -22);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(74, 127, 212, ' + glowA + ')';
        ctx.shadowBlur = 10 * staffGlow;
        ctx.shadowColor = 'rgba(74, 127, 212, ' + (0.4 * staffGlow) + ')';
        ctx.beginPath();
        ctx.arc(-4, -34, 2, 0, Math.PI * 2);
        ctx.arc(4, -34, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        var staffX = 16;
        var staffY = -28;
        ctx.save();
        ctx.translate(staffX, staffY);
        ctx.rotate(-0.15);
        ctx.strokeStyle = '#5a4a2a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 75);
        ctx.stroke();
        ctx.fillStyle = 'rgba(74, 127, 212, ' + glowA + ')';
        ctx.shadowBlur = 18 * staffGlow;
        ctx.shadowColor = 'rgba(74, 127, 212, ' + (0.5 * staffGlow) + ')';
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(-5, 3);
        ctx.lineTo(0, 9);
        ctx.lineTo(5, 3);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        ctx.restore();
    }

    function drawArchmageCombat(ctx, x, y, scale, staffGlow) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        var glowA = 0.4 + staffGlow * 0.6;

        ctx.fillStyle = '#0f0f1c';
        ctx.beginPath();
        ctx.moveTo(-18, -25);
        ctx.quadraticCurveTo(-30, 5, -26, 50);
        ctx.lineTo(30, 50);
        ctx.quadraticCurveTo(34, 5, 22, -25);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0c0c18';
        ctx.beginPath();
        ctx.arc(-2, -32, 15, Math.PI, 0);
        ctx.lineTo(9, -22);
        ctx.quadraticCurveTo(-2, -17, -13, -22);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = 'rgba(74, 127, 212, ' + glowA + ')';
        ctx.shadowBlur = 12 * staffGlow;
        ctx.shadowColor = 'rgba(74, 127, 212, ' + (0.5 * staffGlow) + ')';
        ctx.beginPath();
        ctx.arc(-6, -34, 2, 0, Math.PI * 2);
        ctx.arc(2, -34, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        var staffX = 22;
        var staffY = -15;
        ctx.save();
        ctx.translate(staffX, staffY);
        ctx.rotate(-0.7);
        ctx.strokeStyle = '#5a4a2a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 70);
        ctx.stroke();
        ctx.fillStyle = 'rgba(74, 127, 212, ' + glowA + ')';
        ctx.shadowBlur = 20 * staffGlow;
        ctx.shadowColor = 'rgba(74, 127, 212, ' + (0.6 * staffGlow) + ')';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-5, 3);
        ctx.lineTo(0, 9);
        ctx.lineTo(5, 3);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        ctx.restore();
    }

    function drawArchmageAttack(ctx, x, y, scale, staffGlow, swing) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        var glowA = 0.5 + staffGlow * 0.5;

        ctx.fillStyle = '#0f0f1c';
        ctx.beginPath();
        ctx.moveTo(-15, -25);
        ctx.quadraticCurveTo(-25, 5, -22, 50);
        ctx.lineTo(32, 50);
        ctx.quadraticCurveTo(36, 5, 24, -25);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0c0c18';
        ctx.beginPath();
        ctx.arc(-2, -32, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(74, 127, 212, ' + glowA + ')';
        ctx.shadowBlur = 15 * staffGlow;
        ctx.shadowColor = 'rgba(74, 127, 212, 0.8)';
        ctx.beginPath();
        ctx.arc(-5, -34, 2, 0, Math.PI * 2);
        ctx.arc(1, -34, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        var staffX = 18;
        var staffY = -10;
        ctx.save();
        ctx.translate(staffX, staffY);
        var swingAngle = -0.8 + swing * 2.2;
        ctx.rotate(swingAngle);
        ctx.strokeStyle = '#5a4a2a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 65);
        ctx.stroke();
        var sGlow = staffGlow * (1 + swing * 0.5);
        ctx.fillStyle = 'rgba(74, 127, 212, ' + (0.5 + sGlow * 0.5) + ')';
        ctx.shadowBlur = 25 * sGlow;
        ctx.shadowColor = 'rgba(74, 127, 212, ' + (0.5 + sGlow * 0.3) + ')';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(-5, 3);
        ctx.lineTo(0, 10);
        ctx.lineTo(5, 3);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        if (swing > 0.3 && swing < 0.8) {
            ctx.save();
            ctx.globalAlpha = (0.4 - Math.abs(swing - 0.55) * 2) * staffGlow;
            ctx.strokeStyle = 'rgba(74, 127, 212, 0.6)';
            ctx.lineWidth = 2;
            var arcCenterX = staffX - 5;
            var arcCenterY = staffY + 15;
            ctx.beginPath();
            ctx.arc(arcCenterX, arcCenterY, 50, -1.5 + swing * 1.5, -0.3 + swing * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();
    }

    function drawArchmageVictory(ctx, x, y, scale, staffGlow) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        var glowA = 0.6 + staffGlow * 0.4;

        ctx.fillStyle = '#0f0f1c';
        ctx.beginPath();
        ctx.moveTo(-20, -25);
        ctx.quadraticCurveTo(-28, 10, -24, 50);
        ctx.lineTo(24, 50);
        ctx.quadraticCurveTo(28, 10, 20, -25);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#0c0c18';
        ctx.beginPath();
        ctx.arc(0, -32, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(74, 127, 212, ' + glowA + ')';
        ctx.shadowBlur = 15 * staffGlow;
        ctx.shadowColor = 'rgba(74, 127, 212, 0.9)';
        ctx.beginPath();
        ctx.arc(-4, -34, 2.5, 0, Math.PI * 2);
        ctx.arc(4, -34, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        var staffX = 8;
        var staffY = -40;
        ctx.save();
        ctx.translate(staffX, staffY);
        ctx.rotate(-0.05);
        ctx.strokeStyle = '#5a4a2a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 80);
        ctx.stroke();
        ctx.fillStyle = 'rgba(74, 127, 212, ' + glowA + ')';
        ctx.shadowBlur = 30 * staffGlow;
        ctx.shadowColor = 'rgba(74, 127, 212, ' + (0.6 + staffGlow * 0.3) + ')';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(-6, 3);
        ctx.lineTo(0, 10);
        ctx.lineTo(6, 3);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        ctx.restore();
    }

    function drawShadowWolf(ctx, x, y, scale, time) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        var bob = Math.sin(time * 4) * 1.5;

        ctx.fillStyle = '#08080f';
        ctx.beginPath();
        ctx.ellipse(0, bob, 22, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(22, -4 + bob, 9, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(18, -10 + bob);
        ctx.lineTo(16, -18 + bob);
        ctx.lineTo(23, -11 + bob);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(25, -10 + bob);
        ctx.lineTo(27, -18 + bob);
        ctx.lineTo(29, -11 + bob);
        ctx.fill();

        ctx.fillStyle = '#ff2222';
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(255, 34, 34, 0.6)';
        ctx.beginPath();
        ctx.arc(25, -5 + bob, 1.8, 0, Math.PI * 2);
        ctx.arc(29, -5 + bob, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#08080f';
        ctx.fillRect(-14, 7 + bob, 3, 10);
        ctx.fillRect(-6, 7 + bob, 3, 10);
        ctx.fillRect(6, 7 + bob, 3, 10);
        ctx.fillRect(14, 7 + bob, 3, 10);

        ctx.strokeStyle = '#08080f';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-22, bob);
        ctx.quadraticCurveTo(-32, -8 + bob, -26, -3 + bob);
        ctx.stroke();

        ctx.restore();
    }

    function drawSkeleton(ctx, x, y, scale, time) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        ctx.strokeStyle = '#1a1a22';
        ctx.lineWidth = 2.5;

        ctx.fillStyle = '#1a1a22';
        ctx.beginPath();
        ctx.arc(0, -10, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0a0f';
        ctx.beginPath();
        ctx.arc(-3, -12, 1.5, 0, Math.PI * 2);
        ctx.arc(3, -12, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff2222';
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(255, 34, 34, 0.5)';
        ctx.beginPath();
        ctx.arc(-3, -12, 0.8, 0, Math.PI * 2);
        ctx.arc(3, -12, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#1a1a22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(0, 15);
        ctx.stroke();

        var armSwing = Math.sin(time * 3) * 0.3;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(-10 + armSwing * 5, 8 + armSwing * 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(10 - armSwing * 5, 8 - armSwing * 3);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 15);
        ctx.lineTo(-7, 25);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, 15);
        ctx.lineTo(7, 25);
        ctx.stroke();

        ctx.restore();
    }

    function drawShadowCreature(ctx, x, y, scale, time) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        var pulse = 0.8 + Math.sin(time * 2) * 0.2;

        ctx.fillStyle = 'rgba(5, 5, 15, ' + (0.6 * pulse) + ')';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(20, 0, 40, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20 * pulse, 14 * pulse, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff3333';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255, 50, 50, 0.7)';
        ctx.beginPath();
        ctx.arc(-6, -4, 2.5, 0, Math.PI * 2);
        ctx.arc(6, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(5, 5, 15, ' + (0.3 * pulse) + ')';
        ctx.beginPath();
        ctx.ellipse(-12, -5, 6 * pulse, 4, -0.3, 0, Math.PI * 2);
        ctx.ellipse(12, -5, 6 * pulse, 4, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawTitleScene(ctx) {
        ctx.fillStyle = '#030308';
        ctx.fillRect(0, 0, W, H);

        var grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 300);
        grad.addColorStop(0, 'rgba(201, 168, 76, 0.06)');
        grad.addColorStop(0.5, 'rgba(201, 168, 76, 0.02)');
        grad.addColorStop(1, 'rgba(201, 168, 76, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        engine.emitParticles(1, {
            x: rand(0, W), y: -5,
            color: '#c9a84c',
            size: 1 + Math.random() * 2,
            speed: 10 + Math.random() * 30,
            driftY: 20 + Math.random() * 40,
            life: 3 + Math.random() * 4,
            glow: 0.4 + Math.random() * 0.6,
            maxAlpha: 0.5 + Math.random() * 0.3
        });
    }

    function generateForest() {
        trees = [];
        for (var i = 0; i < 50; i++) {
            trees.push({
                x: i * (W / 50 * 2.5) + rand(-30, 30),
                baseY: H * (0.6 + rand(0, 0.15)),
                height: rand(80, 220),
                width: rand(30, 70),
                depth: rand(0.1, 1.0)
            });
        }
        ruins = [];
        for (var j = 0; j < 15; j++) {
            ruins.push({
                x: j * (W / 15 * 3) + rand(-60, 60),
                baseY: H * (0.6 + rand(0, 0.1)),
                height: rand(60, 180),
                broken: rand(0, 1)
            });
        }
        crystals = [];
        for (var k = 0; k < 12; k++) {
            crystals.push({
                x: rand(0, W * 2),
                y: H * rand(0.35, 0.55),
                size: rand(8, 25),
                hue: ['blue', 'gold', 'purple'][randInt(0, 2)],
                glow: rand(0.2, 1.0)
            });
        }
        stars = [];
        for (var s = 0; s < 120; s++) {
            stars.push({
                x: rand(0, W * 2),
                y: rand(0, H * 0.5),
                size: rand(0.3, 1.2),
                brightness: rand(0.3, 1.0),
                depth: rand(0.1, 0.8)
            });
        }
    }

    function drawForestBackground(ctx, camera, time) {
        drawSky(ctx);
        drawStars(ctx, camera);
        drawGround(ctx);

        var sorted = trees.slice().sort(function (a, b) { return a.depth - b.depth; });
        for (var i = 0; i < sorted.length; i++) {
            var t = sorted[i];
            drawTree(ctx, t.x, t.baseY, t.height, t.width, t.depth, camera);
        }

        for (var j = 0; j < ruins.length; j++) {
            var r = ruins[j];
            drawRuinColumn(ctx, r.x, r.baseY, r.height, r.broken, 0.4 + r.broken * 0.3, camera);
        }

        for (var k = 0; k < crystals.length; k++) {
            var c = crystals[k];
            drawCrystal(ctx, c.x, c.y, c.size, c.hue, c.glow, camera);
        }

        drawMist(ctx, camera, time);
    }

    function drawTowerSilhouette(ctx, camera) {
        var tx = W * 0.75 - camera.x * 0.08;
        var ty = H * 0.25 - camera.y * 0.05;
        ctx.save();
        ctx.fillStyle = '#06060e';
        ctx.beginPath();
        ctx.moveTo(tx - 25, ty + H * 0.5);
        ctx.lineTo(tx - 20, ty + 20);
        ctx.lineTo(tx - 15, ty + 10);
        ctx.lineTo(tx - 8, ty);
        ctx.lineTo(tx - 6, ty - 25);
        ctx.lineTo(tx - 3, ty - 40);
        ctx.lineTo(tx, ty - 45);
        ctx.lineTo(tx + 3, ty - 40);
        ctx.lineTo(tx + 6, ty - 25);
        ctx.lineTo(tx + 8, ty);
        ctx.lineTo(tx + 15, ty + 10);
        ctx.lineTo(tx + 20, ty + 20);
        ctx.lineTo(tx + 25, ty + H * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#080810';
        ctx.beginPath();
        ctx.moveTo(tx - 6, ty - 25);
        ctx.lineTo(tx - 10, ty - 30);
        ctx.lineTo(tx - 12, ty - 38);
        ctx.lineTo(tx - 6, ty - 42);
        ctx.lineTo(tx, ty - 45);
        ctx.lineTo(tx + 6, ty - 42);
        ctx.lineTo(tx + 12, ty - 38);
        ctx.lineTo(tx + 10, ty - 30);
        ctx.lineTo(tx + 6, ty - 25);
        ctx.closePath();
        ctx.fill();

        for (var i = 0; i < 4; i++) {
            var wy = ty - 30 + i * 18;
            ctx.fillStyle = 'rgba(74, 127, 212, 0.03)';
            ctx.fillRect(tx - 3, wy, 6, 10);
        }

        ctx.restore();
    }

    function drawIntroLight(ctx, time) {
        var cx = W / 2;
        var cy = H / 3;
        var pulse = 0.3 + Math.sin(time * 1.5) * 0.15;
        var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
        grad.addColorStop(0, 'rgba(74, 127, 212, ' + pulse + ')');
        grad.addColorStop(0.3, 'rgba(74, 127, 212, ' + pulse * 0.3 + ')');
        grad.addColorStop(1, 'rgba(74, 127, 212, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 150, 0, Math.PI * 2);
        ctx.fill();
    }

    Arquimago.runIntro = function (onComplete) {
        var root = document.getElementById("intro-root");
        if (!root) { if (onComplete) onComplete(); return; }

        if (Arquimago.state && Arquimago.state.introSeen) {
            if (onComplete) onComplete();
            return;
        }

        document.body.classList.add("intro-active");

        root.innerHTML =
            '<div class="intro" id="intro">' +
                '<div class="intro-bg" style="background-image:url(\'assets/illustrations/journey-valley.png\')"></div>' +
                '<div class="intro-vignette"></div>' +
                '<div class="intro-ui" id="intro-ui">' +
                    '<div class="intro-final" id="intro-final">' +
                        '<h1 class="intro-logo">ARQUIMAGO</h1>' +
                        '<p class="intro-sublogo">O RECOMEÇO</p>' +
                        '<button class="intro-start btn-primary" id="intro-start">INICIAR JORNADA</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        Arquimago.playIntroMusic();

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                var finalEl = document.getElementById("intro-final");
                if (finalEl) finalEl.classList.add("visible");
            });
        });

        document.getElementById("intro-start").addEventListener("click", function onClick() {
            Arquimago.playClick();
            Arquimago.stopIntroMusic();
            document.getElementById("intro").classList.add("hidden");
            document.body.classList.remove("intro-active");
            Arquimago.state.introSeen = true;
            Arquimago.saveState(Arquimago.state);
            setTimeout(function () {
                root.innerHTML = "";
                if (onComplete) onComplete();
            }, 900);
        });
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
