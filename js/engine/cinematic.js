(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function clamp(v, min, max) {
        return v < min ? min : v > max ? max : v;
    }

    function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    function easeIn(t) {
        return t * t * t;
    }

    Arquimago.createCinematicEngine = function (canvas) {
        var ctx = canvas.getContext("2d");
        var W = canvas.width;
        var H = canvas.height;
        var scenes = [];
        var currentSceneIndex = -1;
        var elapsed = 0;
        var running = false;
        var rafId = null;
        var lastTime = 0;

        var camera = {
            x: 0, y: 0,
            targetX: 0, targetY: 0,
            zoom: 1, targetZoom: 1,
            speed: 2,
            shakeX: 0, shakeY: 0,
            shakeIntensity: 0
        };

        var fade = {
            color: "#000000",
            alpha: 1,
            targetAlpha: 1,
            speed: 3
        };

        var textOverlay = {
            lines: [],
            active: false
        };

        var particles = [];

        function resize() {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
        }

        function updateCamera(dt) {
            camera.x = lerp(camera.x, camera.targetX, camera.speed * dt);
            camera.y = lerp(camera.y, camera.targetY, camera.speed * dt);
            camera.zoom = lerp(camera.zoom, camera.targetZoom, camera.speed * dt);
            if (camera.shakeIntensity > 0) {
                camera.shakeX = (Math.random() - 0.5) * camera.shakeIntensity;
                camera.shakeY = (Math.random() - 0.5) * camera.shakeIntensity;
                camera.shakeIntensity *= 0.95;
                if (camera.shakeIntensity < 0.5) camera.shakeIntensity = 0;
            } else {
                camera.shakeX = 0;
                camera.shakeY = 0;
            }
        }

        function updateFade(dt) {
            fade.alpha = lerp(fade.alpha, fade.targetAlpha, fade.speed * dt);
            fade.alpha = clamp(fade.alpha, 0, 1);
        }

        function updateParticles(dt) {
            for (var i = particles.length - 1; i >= 0; i--) {
                var p = particles[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                p.vy -= p.gravity * dt;
                if (p.life <= 0) {
                    particles.splice(i, 1);
                }
            }
        }

        function renderParticles(ctx) {
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                var alpha = clamp(p.life / p.maxLife, 0, 1) * p.maxAlpha;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.shadowBlur = p.glow * 10;
                ctx.shadowColor = p.color;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.restore();
            }
        }

        function renderFade(ctx) {
            if (fade.alpha > 0.001) {
                ctx.save();
                ctx.globalAlpha = fade.alpha;
                ctx.fillStyle = fade.color;
                ctx.fillRect(0, 0, W, H);
                ctx.restore();
            }
        }

        function renderText(ctx) {
            for (var i = 0; i < textOverlay.lines.length; i++) {
                var line = textOverlay.lines[i];
                var alpha = 1;
                if (line.timer < line.fadeIn) {
                    alpha = line.timer / line.fadeIn;
                } else if (line.timer > line.duration - line.fadeOut) {
                    alpha = Math.max(0, (line.duration - line.timer) / line.fadeOut);
                }
                if (alpha <= 0) continue;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.textAlign = line.align || "center";
                ctx.textBaseline = "middle";
                ctx.font = line.font || "36px Cinzel, serif";
                ctx.shadowBlur = 20;
                ctx.shadowColor = line.shadowColor || "rgba(201,168,76,0.3)";
                ctx.fillStyle = line.color || "#e8e6e0";
                ctx.fillText(line.text, line.x || W / 2, line.y || H / 2);
                ctx.shadowBlur = 0;
                ctx.restore();
                line.timer += 1 / 60;
            }
            textOverlay.lines = textOverlay.lines.filter(function (l) {
                return l.timer < l.duration;
            });
        }

        var engine = {
            camera: camera,
            fade: fade,
            particles: particles,
            textOverlay: textOverlay,
            W: function () { return W; },
            H: function () { return H; },
            ctx: function () { return ctx; },

            resize: resize,

            addScene: function (id, config) {
                scenes.push({
                    id: id,
                    duration: config.duration || 5000,
                    setup: config.setup || function () {},
                    update: config.update || function () {},
                    render: config.render || function () {},
                    onEnter: config.onEnter || function () {},
                    onExit: config.onExit || function () {}
                });
                return this;
            },

            setFade: function (alpha, color, speed) {
                fade.targetAlpha = alpha;
                if (color !== undefined) fade.color = color;
                if (speed !== undefined) fade.speed = speed;
            },

            fadeToBlack: function (duration, callback) {
                fade.targetAlpha = 1;
                fade.color = "#000000";
                var self = this;
                setTimeout(function () {
                    if (callback) callback();
                }, duration * 1000);
            },

            fadeIn: function (duration) {
                var self = this;
                fade.targetAlpha = 0;
                fade.speed = 1 / (duration || 1);
            },

            fadeOut: function (duration) {
                var self = this;
                fade.targetAlpha = 1;
                fade.speed = 1 / (duration || 1);
            },

            showText: function (text, opts) {
                opts = opts || {};
                textOverlay.lines.push({
                    text: text,
                    x: opts.x || W / 2,
                    y: opts.y || H / 2,
                    font: opts.font || "36px Cinzel, serif",
                    color: opts.color || "#e8e6e0",
                    shadowColor: opts.shadowColor || "rgba(201,168,76,0.3)",
                    align: opts.align || "center",
                    fadeIn: opts.fadeIn || 0.5,
                    fadeOut: opts.fadeOut || 0.8,
                    duration: (opts.duration || 3) + (opts.fadeIn || 0.5) + (opts.fadeOut || 0.8),
                    timer: 0
                });
                return this;
            },

            clearText: function () {
                textOverlay.lines = [];
                return this;
            },

            emitParticles: function (count, config) {
                for (var i = 0; i < count; i++) {
                    var angle = Math.random() * Math.PI * 2;
                    var speed = (config.speed || 50) * (0.5 + Math.random());
                    particles.push({
                        x: config.x || W / 2,
                        y: config.y || H / 2,
                        vx: Math.cos(angle) * speed + (config.driftX || 0),
                        vy: Math.sin(angle) * speed * 0.5 + (config.driftY || -30),
                        size: config.size || (1 + Math.random() * 2),
                        color: config.color || "#c9a84c",
                        glow: config.glow || 0.5,
                        gravity: config.gravity || 20,
                        life: config.life || (1 + Math.random() * 2),
                        maxLife: config.life || (1 + Math.random() * 2),
                        maxAlpha: config.maxAlpha || 0.7
                    });
                }
                return this;
            },

            setCamera: function (x, y, zoom) {
                camera.targetX = x;
                camera.targetY = y;
                if (zoom !== undefined) camera.targetZoom = zoom;
                return this;
            },

            setCameraImmediate: function (x, y, zoom) {
                camera.x = camera.targetX = x;
                camera.y = camera.targetY = y;
                if (zoom !== undefined) camera.zoom = camera.targetZoom = zoom;
                return this;
            },

            shakeCamera: function (intensity) {
                camera.shakeIntensity = intensity;
                return this;
            },

            getScene: function (id) {
                for (var i = 0; i < scenes.length; i++) {
                    if (scenes[i].id === id) return scenes[i];
                }
                return null;
            },

            getCurrentScene: function () {
                return scenes[currentSceneIndex] || null;
            },

            getSceneProgress: function () {
                var scene = scenes[currentSceneIndex];
                if (!scene) return 0;
                return clamp(elapsed / scene.duration, 0, 1);
            },

            getElapsed: function () {
                return elapsed;
            },

            goToScene: function (index) {
                if (index < 0 || index >= scenes.length) return false;
                if (currentSceneIndex >= 0 && scenes[currentSceneIndex].onExit) {
                    scenes[currentSceneIndex].onExit();
                }
                currentSceneIndex = index;
                elapsed = 0;
                if (scenes[currentSceneIndex].onEnter) {
                    scenes[currentSceneIndex].onEnter();
                }
                if (scenes[currentSceneIndex].setup) {
                    scenes[currentSceneIndex].setup();
                }
                return true;
            },

            nextScene: function () {
                return this.goToScene(currentSceneIndex + 1);
            },

            play: function (callback) {
                running = true;
                lastTime = performance.now();
                elapsed = 0;
                currentSceneIndex = 0;

                if (scenes.length > 0) {
                    if (scenes[0].onEnter) scenes[0].onEnter();
                    if (scenes[0].setup) scenes[0].setup();
                }

                var self = this;

                function loop(time) {
                    if (!running) return;
                    var dt = Math.min(0.05, (time - lastTime) / 1000);
                    lastTime = time;

                    var scene = scenes[currentSceneIndex];
                    if (scene) {
                        elapsed += dt;
                        updateCamera(dt);
                        updateFade(dt);
                        updateParticles(dt);

                        if (scene.update) {
                            scene.update(dt, elapsed, clamp(elapsed / scene.duration, 0, 1));
                        }

                        ctx.save();

                        ctx.clearRect(0, 0, W, H);

                        ctx.save();
                        var cx = W / 2;
                        var cy = H / 2;
                        ctx.translate(cx, cy);
                        ctx.scale(camera.zoom, camera.zoom);
                        ctx.translate(-cx + camera.shakeX, -cy + camera.shakeY);
                        ctx.translate(-camera.x, -camera.y);

                        if (scene.render) {
                            scene.render(ctx, camera);
                        }

                        ctx.restore();

                        renderParticles(ctx);
                        renderFade(ctx);
                        renderText(ctx);

                        ctx.restore();

                        if (elapsed >= scene.duration) {
                            if (currentSceneIndex < scenes.length - 1) {
                                self.nextScene();
                            } else {
                                running = false;
                                if (callback) callback();
                                return;
                            }
                        }
                    }

                    rafId = requestAnimationFrame(loop);
                }

                rafId = requestAnimationFrame(loop);
                return this;
            },

            stop: function () {
                running = false;
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                return this;
            },

            destroy: function () {
                this.stop();
                scenes = [];
                particles.length = 0;
                textOverlay.lines = [];
                return this;
            },

            getScenes: function () {
                return scenes;
            },

            getSceneCount: function () {
                return scenes.length;
            },

            getCurrentIndex: function () {
                return currentSceneIndex;
            },

            isRunning: function () {
                return running;
            }
        };

        return engine;
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
