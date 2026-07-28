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
            '<canvas class="intro-canvas" id="intro-canvas"></canvas>' +
            '<div class="intro-ui" id="intro-ui">' +
            '<div class="intro-final" id="intro-final" hidden>' +
            '<h1 class="intro-logo">ARQUIMAGO</h1>' +
            '<p class="intro-sublogo">O RECOMEÇO</p>' +
            '<button class="intro-start btn-primary" id="intro-start">INICIAR JORNADA</button>' +
            '</div></div></div>';

        var canvas = document.getElementById("intro-canvas");
        if (!canvas) { if (onComplete) onComplete(); return; }

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        W = canvas.width;
        H = canvas.height;
        window.addEventListener("resize", function () {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            W = canvas.width;
            H = canvas.height;
        });

        generateForest();
        engine = Arquimago.createCinematicEngine(canvas);
        engine.setFade(1, "#000000", 5);
        Arquimago.playIntroMusic();

        var introAudio = null;
        var awaitingInteraction = false;

        function setAudioLayer(layer) {
            if (Arquimago.setIntroLayer) {
                Arquimago.setIntroLayer(layer);
            }
        }

        // ===== SCENE 1 — Darkness =====
        engine.addScene("darkness", {
            duration: 6000,
            setup: function () {
                engine.setCameraImmediate(W / 2, H / 2, 1);
                engine.setFade(0, "#000000", 2);
                var e = engine;
                setTimeout(function () {
                    e.emitParticles(60, {
                        x: rand(0, W), y: rand(0, H),
                        color: '#88bbff',
                        size: 0.5,
                        speed: 5,
                        driftY: -rand(10, 30),
                        life: 3 + rand(0, 2),
                        glow: 0.3,
                        maxAlpha: 0.4
                    });
                }, 2000);
                setTimeout(function () {
                    e.setFade(0, "#000000", 1);
                }, 500);
                setTimeout(function () {
                    e.showText("Todo grande mago j\u00e1 conheceu o fracasso.", {
                        y: H * 0.6,
                        font: "28px Cinzel, serif",
                        color: "#e8e6e0",
                        shadowColor: "rgba(201,168,76,0.3)",
                        fadeIn: 1.0,
                        fadeOut: 1.2,
                        duration: 3.5
                    });
                }, 2800);
            },
            update: function (dt, elapsed, progress) {
                if (elapsed > 1.5 && elapsed < 3) {
                    var il = (elapsed - 1.5) / 1.5;
                    engine.setFade(1 - il * 0.7, "#000000", 2);
                }
                engine.emitParticles(2, {
                    x: rand(0, W), y: rand(0, H),
                    color: '#6699dd',
                    size: 0.5 + rand(0, 0.5),
                    speed: 3,
                    driftY: -20,
                    life: 2 + rand(0, 2),
                    glow: 0.2,
                    maxAlpha: 0.3
                });
            },
            render: function (ctx, camera) {
                ctx.fillStyle = '#010105';
                ctx.fillRect(0, 0, W, H);
                drawIntroLight(ctx, Date.now() / 1000);
            },
            onEnter: function () { setAudioLayer('ambient'); }
        });

        // ===== SCENE 2 — Forest Ruins =====
        engine.addScene("forest", {
            duration: 8000,
            setup: function () {
                engine.setCamera(0, 0, 1);
                engine.setCameraImmediate(0, 0, 1);
                engine.setFade(1, "#000000", 1.5);
                var e = engine;
                setTimeout(function () { e.setFade(0, "#000000", 1.5); }, 100);
            },
            update: function (dt, elapsed, progress) {
                var camProgress = clamp(elapsed / 7000, 0, 1);
                var cx = lerp(0, 250, easeInOut(camProgress));
                var cy = lerp(0, -15, easeInOut(camProgress));
                engine.setCamera(cx, cy, 1);

                if (elapsed > 1 && Math.random() < 0.15) {
                    engine.emitParticles(1, {
                        x: rand(0, W),
                        y: rand(H * 0.2, H * 0.4),
                        color: ['#c9a84c', '#4a7fd4', '#88bbff'][randInt(0, 2)],
                        size: 0.5 + rand(0, 2),
                        speed: 5 + rand(0, 10),
                        driftY: -15 - rand(0, 20),
                        life: 2 + rand(0, 3),
                        glow: 0.3 + rand(0, 0.4),
                        maxAlpha: 0.4 + rand(0, 0.3)
                    });
                }
            },
            render: function (ctx, camera) {
                var time = Date.now() / 1000;
                drawForestBackground(ctx, camera, time);
            },
            onEnter: function () { setAudioLayer('ambient'); }
        });

        // ===== SCENE 3 — The Fallen Archmage =====
        engine.addScene("fallen", {
            duration: 6000,
            setup: function () {
                engine.setCamera(0, 0, 1);
                engine.setFade(1, "#000000", 1.5);
                var e = engine;
                setTimeout(function () { e.setFade(0, "#000000", 1.5); }, 100);
            },
            update: function (dt, elapsed, progress) {
                var zoomProgress = clamp(elapsed / 5000, 0, 1);
                var zoom = lerp(1, 1.25, easeInOut(zoomProgress));
                engine.setCamera(0, 0, zoom);
                if (elapsed > 0.5 && elapsed < 5.5) {
                    engine.emitParticles(1, {
                        x: W * 0.72, y: H * 0.42,
                        color: '#4a7fd4',
                        size: 0.3 + rand(0, 0.8),
                        speed: 2 + rand(0, 5),
                        driftY: -5 - rand(0, 10),
                        life: 1.5 + rand(0, 1.5),
                        glow: 0.2,
                        maxAlpha: 0.3
                    });
                }
            },
            render: function (ctx, camera) {
                var time = Date.now() / 1000;
                drawForestBackground(ctx, camera, time);
                drawTowerSilhouette(ctx, camera);
                drawArchmageKneeling(ctx, W * 0.35, H * 0.58, 1.8, 0.15);
            },
            onEnter: function () { setAudioLayer('ambient'); }
        });

        // ===== SCENE 4 — Narration =====
        engine.addScene("narration", {
            duration: 10000,
            setup: function () {
                engine.setCamera(0, 0, 1.25);
                engine.setFade(1, "#000000", 1);
                var e = engine;
                setTimeout(function () { e.setFade(0, "#000000", 1); }, 100);
                setTimeout(function () {
                    e.showText("Voc\u00ea j\u00e1 dominou a magia.", {
                        y: H * 0.45, font: "32px Cinzel, serif",
                        fadeIn: 0.8, fadeOut: 0.8, duration: 1.5
                    });
                }, 800);
                setTimeout(function () {
                    e.showText("Mas abandonou aquilo que realmente importava.", {
                        y: H * 0.55, font: "28px Cinzel, serif",
                        color: "#c9a84c", shadowColor: "rgba(201,168,76,0.5)",
                        fadeIn: 0.8, fadeOut: 0.8, duration: 1.5
                    });
                }, 3800);
                setTimeout(function () {
                    e.showText("Agora resta apenas uma escolha.", {
                        y: H * 0.5, font: "36px Cinzel, serif",
                        color: "#e8e6e0", shadowColor: "rgba(201,168,76,0.4)",
                        fadeIn: 1.0, fadeOut: 1.0, duration: 2.0
                    });
                }, 6800);
            },
            update: function (dt, elapsed, progress) {
                if (elapsed > 0.5 && Math.random() < 0.1) {
                    engine.emitParticles(1, {
                        x: rand(W * 0.2, W * 0.8),
                        y: rand(H * 0.3, H * 0.5),
                        color: '#4a7fd4',
                        size: 0.5 + rand(0, 1),
                        speed: 3,
                        driftY: -10,
                        life: 2 + rand(0, 2),
                        glow: 0.2,
                        maxAlpha: 0.3
                    });
                }
            },
            render: function (ctx, camera) {
                var time = Date.now() / 1000;
                drawForestBackground(ctx, camera, time);
                drawTowerSilhouette(ctx, camera);
                drawArchmageKneeling(ctx, W * 0.35, H * 0.58, 1.8, 0.2);
            },
            onEnter: function () { setAudioLayer('ambient'); }
        });

        // ===== SCENE 5 — Rising =====
        engine.addScene("rising", {
            duration: 8000,
            setup: function () {
                engine.setCamera(0, 0, 1.15);
                engine.setFade(1, "#000000", 1.5);
                var e = engine;
                setTimeout(function () { e.setFade(0, "#000000", 1.5); }, 100);
            },
            update: function (dt, elapsed, progress) {
                var riseP = clamp((elapsed - 1000) / 2500, 0, 1);
                var staffGlow = clamp((elapsed - 2500) / 2000, 0, 1);
                var easedRise = easeInOut(riseP);

                var magX = W * 0.35;
                var magY = H * 0.58 - easedRise * 30;
                engine.camera.targetY = -easedRise * 10;

                if (staffGlow > 0) {
                    var count = Math.floor(staffGlow * 8);
                    for (var i = 0; i < count; i++) {
                        engine.emitParticles(1, {
                            x: magX + rand(-5, 5),
                            y: magY - 30 + rand(-5, 5),
                            color: '#4a7fd4',
                            size: 0.5 + rand(0, 1.5) * staffGlow,
                            speed: 10 + rand(0, 20) * staffGlow,
                            driftY: -(20 + rand(0, 30)) * staffGlow,
                            life: 1 + rand(0, 2),
                            glow: 0.3 + staffGlow * 0.5,
                            maxAlpha: 0.3 + staffGlow * 0.4
                        });
                    }
                }

                if (staffGlow > 0.5 && Math.random() < 0.3) {
                    engine.emitParticles(1, {
                        x: rand(0, W),
                        y: rand(H * 0.2, H * 0.6),
                        color: '#c9a84c',
                        size: 0.5 + rand(0, 1.5) * staffGlow,
                        speed: 5 + rand(0, 10),
                        driftY: -(10 + rand(0, 20)),
                        life: 2 + rand(0, 2),
                        glow: 0.2 + staffGlow * 0.3,
                        maxAlpha: 0.2 + staffGlow * 0.3
                    });
                }

                if (staffGlow > 0.3) {
                    setAudioLayer('build');
                }
            },
            render: function (ctx, camera) {
                var time = Date.now() / 1000;
                drawForestBackground(ctx, camera, time);
                drawTowerSilhouette(ctx, camera);

                var riseP = clamp((engine.getElapsed() - 1000) / 2500, 0, 1);
                var standP = easeInOut(riseP);
                var staffGlow = clamp((engine.getElapsed() - 2500) / 2000, 0, 1);
                var magY = H * 0.58 - standP * 30;

                if (standP < 0.5) {
                    var kp = standP * 2;
                    drawArchmageKneeling(ctx, W * 0.35, magY, 1.8, kp * 0.3);
                } else {
                    drawArchmageStanding(ctx, W * 0.35, magY, 1.8, staffGlow);
                }
            },
            onEnter: function () { setAudioLayer('ambient'); }
        });

        // ===== SCENE 6 — Threat =====
        engine.addScene("threat", {
            duration: 5000,
            setup: function () {
                engine.setCamera(W * 0.15, 0, 1.1);
                engine.setFade(1, "#000000", 1);
                var e = engine;
                setTimeout(function () { e.setFade(0, "#000000", 1); }, 100);
            },
            update: function (dt, elapsed, progress) {
                if (elapsed > 800) {
                    var camProgress = clamp((elapsed - 800) / 2000, 0, 1);
                    var cx = lerp(W * 0.15, -W * 0.1, easeInOut(camProgress));
                    engine.setCamera(cx, 0, 1.1);

                    if (elapsed > 3500) {
                        engine.emitParticles(2, {
                            x: rand(W * 0.6, W * 0.9),
                            y: rand(H * 0.3, H * 0.6),
                            color: '#ff2222',
                            size: 0.5 + rand(0, 1),
                            speed: 5,
                            driftY: -5,
                            life: 1 + rand(0, 1),
                            glow: 0.3,
                            maxAlpha: 0.3
                        });
                    }
                }
                setAudioLayer('intense');
            },
            render: function (ctx, camera) {
                var time = Date.now() / 1000;
                var elapsed = engine.getElapsed();
                drawForestBackground(ctx, camera, time);
                drawTowerSilhouette(ctx, camera);

                drawArchmageCombat(ctx, W * 0.2, H * 0.58, 1.8, 0.8);

                var creatureAlpha = clamp((elapsed - 1000) / 1000, 0, 1);
                ctx.save();
                ctx.globalAlpha = creatureAlpha;

                drawShadowWolf(ctx, W * 0.72, H * 0.58, 1.2, time);
                drawSkeleton(ctx, W * 0.82, H * 0.56, 1.0, time);
                drawShadowWolf(ctx, W * 0.88, H * 0.62, 1.0, time + 1.5);
                drawShadowCreature(ctx, W * 0.78, H * 0.5, 1.0, time);

                ctx.restore();
            },
            onEnter: function () { setAudioLayer('build'); }
        });

        // ===== SCENE 7 — Combat =====
        engine.addScene("combat", {
            duration: 7000,
            setup: function () {
                engine.setCamera(-W * 0.1, 0, 1.1);
                engine.setFade(1, "#000000", 0.8);
                var e = engine;
                setTimeout(function () { e.setFade(0, "#000000", 0.8); }, 100);
            },
            update: function (dt, elapsed, progress) {
                setAudioLayer('action');
                if (elapsed < 500) {
                    engine.setCamera(-W * 0.1 + elapsed / 500 * 10, 0, 1.1);
                }

                var attack1 = clamp((elapsed - 600) / 1200, 0, 1);
                var attack2 = clamp((elapsed - 2000) / 1000, 0, 1);
                var attack3 = clamp((elapsed - 3300) / 900, 0, 1);
                var attack4 = clamp((elapsed - 4500) / 800, 0, 1);

                if (elapsed > 5500) {
                    engine.shakeCamera(2);
                    var vp = clamp((elapsed - 5500) / 700, 0, 1);
                    engine.setFade(vp, "#ffffff", 3);
                }

                if ((attack1 > 0.1 && attack1 < 0.7) ||
                    (attack2 > 0.1 && attack2 < 0.7) ||
                    (attack3 > 0.1 && attack3 < 0.7) ||
                    (attack4 > 0.1 && attack4 < 0.7)) {
                    engine.shakeCamera(4);
                    for (var i = 0; i < 5; i++) {
                        engine.emitParticles(1, {
                            x: W * 0.7 + rand(-20, 20),
                            y: H * 0.5 + rand(-20, 20),
                            color: '#4a7fd4',
                            size: 1 + rand(0, 3),
                            speed: 20 + rand(0, 30),
                            driftY: -20,
                            life: 0.5 + rand(0, 0.5),
                            glow: 0.5,
                            maxAlpha: 0.7
                        });
                    }
                }
            },
            render: function (ctx, camera) {
                var time = Date.now() / 1000;
                var elapsed = engine.getElapsed();
                drawForestBackground(ctx, camera, time);
                drawTowerSilhouette(ctx, camera);

                var attack1 = clamp((elapsed - 600) / 1200, 0, 1);
                var attack2 = clamp((elapsed - 2000) / 1000, 0, 1);
                var attack3 = clamp((elapsed - 3300) / 900, 0, 1);
                var attack4 = clamp((elapsed - 4500) / 800, 0, 1);
                var victory = clamp((elapsed - 5500) / 700, 0, 1);

                if (victory > 0) {
                    drawArchmageVictory(ctx, W * 0.25, H * 0.58, 1.8, 0.5 + victory * 0.5);
                } else if (attack4 > 0) {
                    drawArchmageAttack(ctx, W * 0.25, H * 0.58, 1.8, 1.0, attack4);
                } else if (attack3 > 0) {
                    drawArchmageAttack(ctx, W * 0.25, H * 0.58, 1.8, 1.0, attack3);
                } else if (attack2 > 0) {
                    drawArchmageAttack(ctx, W * 0.25, H * 0.58, 1.8, 1.0, attack2);
                } else if (attack1 > 0) {
                    drawArchmageAttack(ctx, W * 0.25, H * 0.58, 1.8, 1.0, attack1);
                } else {
                    drawArchmageCombat(ctx, W * 0.25, H * 0.58, 1.8, 1.0);
                }

                var wolf1Alive = attack1 < 0.8;
                var wolf2Alive = attack2 < 0.8;
                var skeletonAlive = attack3 < 0.8;
                var shadowAlive = attack4 < 0.8;

                if (wolf1Alive) {
                    var wobble = attack1 > 0.3 ? Math.sin(attack1 * 10) * 3 : 0;
                    drawShadowWolf(ctx, W * 0.72 + wobble, H * 0.58, 1.2, time);
                } else {
                    ctx.save();
                    ctx.globalAlpha = 1 - attack1;
                    drawShadowWolf(ctx, W * 0.72, H * 0.58 + attack1 * 30, 1.2 * (1 - attack1 * 0.5), time);
                    ctx.restore();
                }

                if (wolf2Alive) {
                    var wobble2 = attack2 > 0.3 ? Math.sin(attack2 * 10 + 1) * 3 : 0;
                    drawShadowWolf(ctx, W * 0.88 + wobble2, H * 0.62, 1.0, time + 1.5);
                } else {
                    ctx.save();
                    ctx.globalAlpha = 1 - attack2;
                    drawShadowWolf(ctx, W * 0.88, H * 0.62 + attack2 * 25, 1.0 * (1 - attack2 * 0.5), time + 1.5);
                    ctx.restore();
                }

                if (skeletonAlive) {
                    var wobble3 = attack3 > 0.3 ? Math.sin(attack3 * 8 + 2) * 4 : 0;
                    drawSkeleton(ctx, W * 0.82 + wobble3, H * 0.56, 1.0, time);
                } else {
                    ctx.save();
                    ctx.globalAlpha = 1 - attack3;
                    drawSkeleton(ctx, W * 0.82, H * 0.56 + attack3 * 20, 1.0 * (1 - attack3 * 0.5), time);
                    ctx.restore();
                }

                if (shadowAlive) {
                    var pulse = Math.sin(time * 3 + attack4 * 5) * 5;
                    drawShadowCreature(ctx, W * 0.78 + pulse, H * 0.5 + pulse * 0.3, 1.0, time);
                } else {
                    ctx.save();
                    ctx.globalAlpha = 1 - attack4;
                    var wa = 0.8 + attack4 * 0.5;
                    drawShadowCreature(ctx, W * 0.78, H * 0.5 + attack4 * 40, wa, time);
                    ctx.restore();
                }
            },
            onEnter: function () { setAudioLayer('action'); }
        });

        // ===== SCENE 8 — Conclusion =====
        engine.addScene("conclusion", {
            duration: 8000,
            setup: function () {
                engine.setCamera(0, 0, 1);
                engine.setFade(1, "#ffffff", 2);
                var e = engine;
                setTimeout(function () {
                    e.setFade(0.5, "#000000", 2);
                }, 200);
                setTimeout(function () {
                    e.setFade(0, "#000000", 2);
                }, 1200);
                setTimeout(function () {
                    e.showText("O verdadeiro inimigo nunca foi o mundo.", {
                        y: H * 0.45,
                        font: "30px Cinzel, serif",
                        fadeIn: 1.0, fadeOut: 1.0, duration: 2.0
                    });
                }, 1500);
                setTimeout(function () {
                    e.showText("O verdadeiro inimigo foi abandonar quem voc\u00ea poderia se tornar.", {
                        y: H * 0.55,
                        font: "26px Cinzel, serif",
                        color: "#c9a84c",
                        shadowColor: "rgba(201,168,76,0.5)",
                        fadeIn: 1.0, fadeOut: 1.2, duration: 2.5
                    });
                }, 5000);
            },
            update: function (dt, elapsed, progress) {
                if (elapsed > 1 && Math.random() < 0.2) {
                    engine.emitParticles(1, {
                        x: rand(0, W),
                        y: rand(H * 0.3, H * 0.6),
                        color: '#c9a84c',
                        size: 0.5 + rand(0, 1.5),
                        speed: 5 + rand(0, 10),
                        driftY: -(10 + rand(0, 20)),
                        life: 2 + rand(0, 2),
                        glow: 0.3,
                        maxAlpha: 0.4
                    });
                }
                if (elapsed > 6) {
                    setAudioLayer('triumph');
                }
            },
            render: function (ctx, camera) {
                var elapsed = engine.getElapsed();
                var fadeAlpha = clamp((elapsed - 1000) / 2000, 0, 0.3);
                ctx.fillStyle = '#030308';
                ctx.fillRect(0, 0, W, H);

                var grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 250);
                grad.addColorStop(0, 'rgba(201, 168, 76, ' + (0.04 + fadeAlpha * 0.06) + ')');
                grad.addColorStop(1, 'rgba(201, 168, 76, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, W, H);

                var staffGlow = 0.5 + Math.sin(Date.now() / 1000) * 0.2;
                drawArchmageVictory(ctx, W * 0.5, H * 0.58, 1.8, staffGlow);
            },
            onEnter: function () { setAudioLayer('build'); }
        });

        // ===== SCENE 9 — Title =====
        engine.addScene("title", {
            duration: 1e8,
            setup: function () {
                engine.setFade(1, "#000000", 2);
                var e = engine;
                setTimeout(function () { e.setFade(0, "#000000", 2); }, 100);
                setTimeout(function () {
                    var finalEl = document.getElementById("intro-final");
                    if (finalEl) {
                        finalEl.hidden = false;
                        requestAnimationFrame(function () {
                            finalEl.classList.add("visible");
                        });
                        document.getElementById("intro-start").addEventListener("click", function onClick() {
                            Arquimago.playClick();
                            Arquimago.stopIntroMusic();
                            var intro = document.getElementById("intro");
                            intro.classList.add("hidden");
                            document.body.classList.remove("intro-active");
                            Arquimago.state.introSeen = true;
                            Arquimago.saveState(Arquimago.state);
                            engine.stop();
                            setTimeout(function () {
                                root.innerHTML = "";
                                if (onComplete) onComplete();
                            }, 900);
                        });
                    }
                }, 1500);
            },
            update: function (dt, elapsed, progress) {
                drawTitleScene(ctx);
                if (elapsed > 2 && Math.random() < 0.3) {
                    engine.emitParticles(1, {
                        x: rand(0, W),
                        y: rand(0, H),
                        color: '#c9a84c',
                        size: 0.5 + rand(0, 1.5),
                        speed: 5 + rand(0, 15),
                        driftY: -(15 + rand(0, 30)),
                        life: 2 + rand(0, 3),
                        glow: 0.3 + rand(0, 0.4),
                        maxAlpha: 0.4 + rand(0, 0.3)
                    });
                }
                setAudioLayer('triumph');
            },
            render: function (ctx, camera) {},
            onEnter: function () { setAudioLayer('triumph'); }
        });

        engine.play();
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
