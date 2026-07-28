import { TILE, getRoom, ROOMS } from "./engine/world.js";
import { createInputController } from "./engine/input.js";
import { createCamera } from "./engine/camera.js";
import { createParticleSystem } from "./engine/particles.js";
import { createRenderer } from "./engine/renderer.js";
import { createPlayer, updatePlayer, playerAttack, playerCastMagic, getAttackHitbox, getMagicHitbox, damagePlayer, healPlayer, restoreMana, addXP, drawPlayer } from "./engine/player.js";
import { createEnemy, updateEnemy, hitEnemy, getEnemyAttack, drawEnemy } from "./engine/enemy.js";
import { createDialogueSystem } from "./engine/dialogue.js";
import { createAudioManager } from "./engine/audio.js";
import { getNearbyEntity, interactWith, checkDoorExits } from "./engine/entities.js";
import { createQuestSystem } from "./engine/quest.js";

const GAME_W = 480;
const GAME_H = 320;

let gameInstance = null;

function buildMarkup() {
    return `
    <div class="history-page">
        <div class="history-shell">
            <div class="history-header">
                <h2>Aventura do Arquimago</h2>
                <span class="history-pill" id="hChapter"></span>
            </div>
            <div class="history-panel" id="hPanel"></div>
            <div class="history-canvas-wrap">
                <canvas id="historyCanvas"></canvas>
                <div class="history-mobile-controls" id="historyMobileControls"></div>
            </div>
            <div class="history-quest-bar" id="hQuestBar"></div>
            <div class="history-toast" id="hToast"></div>
        </div>
    </div>`;
}

function createGame(container, globalState) {
    const Arq = window.Arquimago;
    const hState = globalState.history || {
        currentRoom: "forest_clearing",
        playerStartX: 7, playerStartY: 5,
        memoryFragments: [],
        completedQuests: [],
        npcStates: {},
        objectStates: {},
        leverStates: {},
        bossDefeated: false,
    };
    globalState.history = hState;
    window._historyState = hState;

    container.innerHTML = buildMarkup();

    const canvas = document.getElementById("historyCanvas");
    const mobileEl = document.getElementById("historyMobileControls");
    const panelEl = document.getElementById("hPanel");
    const chapterEl = document.getElementById("hChapter");
    const questBarEl = document.getElementById("hQuestBar");
    const toastEl = document.getElementById("hToast");

    const input = createInputController(mobileEl);
    const renderer = createRenderer(canvas, GAME_W, GAME_H);
    const camera = createCamera(GAME_W, GAME_H);
    const particles = createParticleSystem();
    const dialogue = createDialogueSystem();
    const audio = createAudioManager();
    const quests = createQuestSystem();

    quests.init(hState.completedQuests, hState.completedQuests);

    let currentRoomKey = hState.currentRoom || "forest_clearing";
    let currentRoom = getRoom(currentRoomKey);
    let player = createPlayer(hState.playerStartX || 7, hState.playerStartY || 5);
    let enemies = [];
    let roomObjects = [];
    let roomNpcs = [];

    let running = false;
    let animFrame = null;
    let lastTime = 0;
    let transitionAlpha = 0;
    let transitionDir = 0;
    let transitionCallback = null;
    let pendingMessage = null;
    let messageTimer = 0;
    let stepSoundTimer = 0;
    let ambientTimer = 0;
    let gameStarted = false;

    function initRoom() {
        currentRoom = getRoom(currentRoomKey);
        if (!currentRoom) return;

        hState.currentRoom = currentRoomKey;

        enemies = (currentRoom.enemies || []).map(e => createEnemy(e));

        roomObjects = (currentRoom.objects || []).map(o => ({ ...o }));
        roomNpcs = currentRoom.npcs || [];

        roomObjects.forEach(o => {
            const saved = hState.objectStates[o.id];
            if (saved) {
                if (o.type === "chest") o.opened = saved.opened || false;
                if (o.type === "lever") o.activated = saved.activated || false;
                if (o.type === "door") o.locked = saved.locked !== undefined ? saved.locked : o.locked;
                if (o.type === "potion") o.collected = saved.collected || false;
                if (o.type === "torch") o.lit = saved.lit !== undefined ? saved.lit : o.lit;
            }
        });

        roomObjects.forEach(o => {
            if (o.type === "lever" && o.activated && o.activated) {
                hState.leverStates[o.id] = true;
            }
        });

        checkDoorLocks();

        const px = (hState.playerStartX || 7) * TILE + TILE / 2;
        const py = (hState.playerStartY || 5) * TILE + TILE / 2;
        player.x = px;
        player.y = py;

        camera.snapTo(px, py, currentRoom.width * TILE, currentRoom.height * TILE);

        updatePanel();
        updateQuestBar();
    }

    function checkDoorLocks() {
        roomObjects.forEach(o => {
            if (o.type === "door" && o.requires) {
                const reqs = Array.isArray(o.requires) ? o.requires : [o.requires];
                o.locked = !reqs.every(reqId => hState.leverStates[reqId]);
            }
        });
    }

    function saveObjectStates() {
        roomObjects.forEach(o => {
            if (o.type === "chest" || o.type === "lever" || o.type === "door" || o.type === "potion" || o.type === "torch") {
                hState.objectStates[o.id] = {
                    opened: o.opened,
                    activated: o.activated,
                    locked: o.locked,
                    collected: o.collected,
                    lit: o.lit,
                };
            }
        });
        hState.completedQuests = quests.getCompletedIds();
        saveState();
    }

    function saveState() {
        try {
            if (Arq && Arq.saveState) Arq.saveState(globalState);
        } catch (e) {}
    }

    function showToast(text, color) {
        if (!toastEl) return;
        toastEl.textContent = text;
        toastEl.style.color = color || "#c9a84c";
        toastEl.classList.add("visible");
        clearTimeout(toastEl._timer);
        toastEl._timer = setTimeout(() => toastEl.classList.remove("visible"), 2500);
    }

    function showMessage(text, speaker) {
        const lines = [];
        if (speaker) lines.push({ speaker, text });
        else lines.push({ speaker: "", text });
        dialogue.start(lines);
    }

    function showNotification(text) {
        pendingMessage = text;
        messageTimer = 2.5;
    }

    function transitionToRoom(target, tx, ty) {
        if (transitionDir !== 0) return;
        transitionDir = 1;
        transitionAlpha = 0;
        transitionCallback = () => {
            currentRoomKey = target;
            hState.currentRoom = target;
            hState.playerStartX = tx;
            hState.playerStartY = ty;
            initRoom();
            transitionDir = -1;
        };
    }

    function handleInteraction() {
        if (dialogue.isActive()) {
            dialogue.advance();
            audio.playDialogue();
            return;
        }

        const entity = getNearbyEntity(player.x, player.y, { npcs: roomNpcs, objects: roomObjects }, 44);
        if (!entity) return;

        const result = interactWith(entity, hState, player);
        if (!result) return;

        switch (result.type) {
            case "dialogue":
                dialogue.start(result.entity.dialogue, () => {
                    if (result.entity.questGiver && result.entity.questId) {
                        quests.activate(result.entity.questId);
                        showToast("Nova missão: " + (quests.getAll().find(q => q.id === result.entity.questId)?.name || ""), "#44ccff");
                        updateQuestBar();
                    }
                });
                audio.playDialogue();
                break;

            case "memory_fragment":
                particles.emitMagic(player.x, player.y, result.entity.color || "#7b68ee");
                audio.playPickup();
                showNotification(result.message);
                const notifications = quests.check(hState, hState.leverStates);
                notifications.forEach(n => {
                    if (n.type === "quest_complete") {
                        showToast("Missão completa: " + n.quest.name, "#44cc44");
                        if (n.quest.reward) addXP(player, n.quest.reward.xp);
                    }
                });
                updatePanel();
                updateQuestBar();
                checkVictory();
                break;

            case "chest":
                particles.emitBurst(player.x, player.y, "#c9a84c", 15);
                audio.playChest();
                if (result.contains === "key") {
                    showNotification("Chave obtida!");
                } else if (result.contains === "mana_shard") {
                    restoreMana(player, 25);
                    showNotification("+25 MP!");
                } else if (result.contains === "memory_fragment") {
                    if (!hState.memoryFragments.includes(result.entity.id)) {
                        hState.memoryFragments.push(result.entity.id);
                    }
                    showNotification("Fragmento de memória encontrado!");
                } else if (result.contains === "spell_boost") {
                    player.maxMana += 10;
                    player.mana = player.maxMana;
                    showNotification("Capacidade de mana aumentada!");
                }
                saveObjectStates();
                updatePanel();
                break;

            case "potion":
                particles.emitBurst(player.x, player.y, result.entity.color || "#ff4444", 10);
                audio.playPickup();
                showNotification(result.message);
                saveObjectStates();
                updatePanel();
                break;

            case "book":
                dialogue.start([
                    { speaker: result.title || "Livro", text: result.text }
                ]);
                addXP(player, 5);
                audio.playDialogue();
                updatePanel();
                break;

            case "lever":
                audio.playDoor();
                hState.leverStates[result.entity.id] = result.activated;
                checkDoorLocks();
                particles.emitBurst(result.entity.x * TILE + TILE / 2, result.entity.y * TILE + TILE / 2, result.activated ? "#44cc44" : "#cc4444", 12);
                showNotification(result.activated ? "Mecanismo ativado!" : "Mecanismo desativado!");
                saveObjectStates();
                quests.check(hState, hState.leverStates);
                updateQuestBar();
                break;

            case "monument":
                dialogue.start([
                    { speaker: "Monumento", text: "Uma inscrição antiga brilha sob seu toque..." },
                    { speaker: "Monumento", text: "\"O Arquimago um dia governou estas terras.\"" },
                    { speaker: "Monumento", text: "\"Seus fragmentos de memória foram espalhados pelas trevas.\"" },
                ]);
                audio.playPickup();
                break;

            case "already_interacted":
                showMessage(result.message);
                break;
        }
    }

    function handleCombat(dt) {
        const jp = input.consumeJustPressed();

        if (jp.action) {
            handleInteraction();
        }

        if (jp.magic) {
            if (playerCastMagic(player)) {
                audio.playMagic();
                const hitbox = getMagicHitbox(player);
                particles.emitMagic(hitbox.x, hitbox.y, "#7b68ee");
                enemies.forEach(e => {
                    if (!e.alive) return;
                    const dx = e.x - hitbox.x;
                    const dy = e.y - hitbox.y;
                    if (Math.sqrt(dx * dx + dy * dy) < hitbox.r + e.size) {
                        const killed = hitEnemy(e, 25, 0.3);
                        particles.emitBurst(e.x, e.y, e.color, 8);
                        if (killed) onEnemyDefeated(e);
                    }
                });
                camera.shake(3, 0.15);
            }
        }

        if (input.state.action && player.attackCooldown <= 0 && !dialogue.isActive()) {
            if (playerAttack(player)) {
                audio.playAttack();
                const hitbox = getAttackHitbox(player);
                enemies.forEach(e => {
                    if (!e.alive) return;
                    const dx = e.x - hitbox.x;
                    const dy = e.y - hitbox.y;
                    if (Math.sqrt(dx * dx + dy * dy) < hitbox.r + e.size) {
                        const killed = hitEnemy(e, 12, 0.15);
                        particles.emitBurst(e.x, e.y, "#ffaa44", 6);
                        camera.shake(2, 0.1);
                        if (killed) onEnemyDefeated(e);
                    }
                });
            }
        }

        enemies.forEach(e => {
            const result = updateEnemy(e, player.x, player.y, dt, currentRoom);
            if (result !== false && typeof result === "number") {
                if (damagePlayer(player, result)) {
                    audio.playHit();
                    camera.shake(4, 0.2);
                    particles.emitBurst(player.x, player.y, "#ff4444", 8);
                    if (!player.alive) {
                        setTimeout(() => {
                            player.alive = true;
                            player.hp = player.maxHp;
                            player.mana = player.maxMana;
                            showToast("Você foi restaurado!", "#44cc44");
                        }, 1000);
                    }
                }
            }
        });

        if (player.mana < player.maxMana) {
            player.mana = Math.min(player.maxMana, player.mana + 0.5 * dt);
        }
    }

    function onEnemyDefeated(e) {
        audio.playEnemyDefeated();
        particles.emitBurst(e.x, e.y, "#c9a84c", 20);
        addXP(player, e.xp);
        showToast("+" + e.xp + " XP", "#c9a84c");

        if (e.isBoss) {
            hState.bossDefeated = true;
            showToast("Guardião das Sombras derrotado!", "#ff44ff");
            camera.shake(6, 0.4);
            setTimeout(() => {
                dialogue.start([
                    { speaker: "", text: "As sombras se dissipam..." },
                    { speaker: "", text: "O poder do Arquimago começa a fluir novamente." },
                    { speaker: "", text: "Sua jornada está completa. A era das trevas chegou ao fim." },
                ]);
                audio.playVictory();
            }, 1000);
        }

        const notifications = quests.check(hState, hState.leverStates);
        notifications.forEach(n => {
            if (n.type === "quest_complete") {
                showToast("Missão completa: " + n.quest.name, "#44cc44");
            }
        });
        updatePanel();
        updateQuestBar();
        updateEnemySpawn();
    }

    function updateEnemySpawn() {
        const alive = enemies.filter(e => e.alive);
        if (alive.length === 0 && currentRoom.enemies && currentRoom.enemies.length > 0) {
            setTimeout(() => {
                enemies = currentRoom.enemies.map(e => createEnemy(e));
                enemies.forEach(e => {
                    e.x = e.x + (Math.random() - 0.5) * 60;
                    e.y = e.y + (Math.random() - 0.5) * 60;
                });
            }, 3000);
        }
    }

    function checkVictory() {
        if (hState.memoryFragments.length >= 8) {
            showToast("Todos os fragmentos coletados!", "#ffcc00");
        }
    }

    function updatePanel() {
        if (!panelEl) return;
        const fragCount = hState.memoryFragments.length;
        panelEl.innerHTML = `
            <div class="history-stat"><span>Progresso</span><strong>${Math.round(fragCount / 8 * 100)}%</strong></div>
            <div class="history-stat"><span>Fragmentos</span><strong>${fragCount}/8</strong></div>
            <div class="history-stat"><span>Nível</span><strong>${player.level}</strong></div>
            <div class="history-stat"><span>Missões</span><strong>${quests.getCompleted().length}</strong></div>
        `;
    }

    function updateQuestBar() {
        if (!questBarEl) return;
        const active = quests.getActive();
        if (active.length === 0) {
            questBarEl.innerHTML = '<span class="history-quest-empty">Nenhuma missão ativa</span>';
        } else {
            questBarEl.innerHTML = active.slice(0, 2).map(q =>
                `<div class="history-quest-item">\u2605 ${q.name}: ${q.desc}</div>`
            ).join("");
        }
    }

    function update(dt) {
        if (!gameStarted) return;

        if (transitionDir !== 0) {
            if (transitionDir === 1) {
                transitionAlpha = Math.min(1, transitionAlpha + dt * 3);
                if (transitionAlpha >= 1 && transitionCallback) {
                    transitionCallback();
                    transitionCallback = null;
                }
            } else {
                transitionAlpha = Math.max(0, transitionAlpha - dt * 3);
                if (transitionAlpha <= 0) transitionDir = 0;
            }
            return;
        }

        if (dialogue.isActive()) {
            dialogue.update(dt);
            return;
        }

        updatePlayer(player, input.state, dt, currentRoom, () => {
            audio.playStep();
        });

        camera.follow(player.x, player.y, currentRoom.width * TILE, currentRoom.height * TILE);
        camera.update(dt);

        handleCombat(dt);
        particles.update(dt);

        ambientTimer += dt;
        if (ambientTimer > 0.5 && currentRoom.ambientParticles) {
            ambientTimer = 0;
            const ap = currentRoom.ambientParticles;
            for (let i = 0; i < Math.min(ap.count, 3); i++) {
                const ax = camera.getX() + Math.random() * GAME_W;
                const ay = camera.getY() + Math.random() * GAME_H;
                particles.emitTrail(ax, ay, ap.color);
            }
        }

        const exitResult = checkDoorExits(currentRoom, player.x, player.y);
        if (exitResult && exitResult.exit) {
            hState.playerStartX = exitResult.tx;
            hState.playerStartY = exitResult.ty;
            transitionToRoom(exitResult.exit.target, exitResult.tx, exitResult.ty);
        }
        if (exitResult && exitResult.blocked) {
            if (!pendingMessage) {
                showNotification(exitResult.message);
            }
        }

        if (messageTimer > 0) {
            messageTimer -= dt;
            if (messageTimer <= 0) pendingMessage = null;
        }
    }

    function render(time) {
        renderer.clear(currentRoom.bg || "#050508");

        const camX = camera.getX();
        const camY = camera.getY();

        renderer.drawRoom(currentRoom, camX, camY, time);

        roomObjects.forEach(obj => {
            if (obj.type === "door" && obj.locked) {
                renderer.drawObject(renderer.ctx, obj, camX, camY, time);
            }
        });

        roomObjects.forEach(obj => {
            if (obj.type !== "door") {
                renderer.drawObject(renderer.ctx, obj, camX, camY, time);
            }
        });

        roomNpcs.forEach(npc => {
            renderer.drawNPC(renderer.ctx, npc, camX, camY, time);
        });

        enemies.forEach(e => {
            drawEnemy(renderer.ctx, e, camX, camY, time);
        });

        drawPlayer(renderer.ctx, player, camX, camY, time);

        particles.draw(renderer.ctx, camX, camY);

        roomObjects.forEach(obj => {
            if (obj.type === "torch" && obj.lit) {
                const sx = obj.x * TILE + TILE / 2 - camX;
                const sy = obj.y * TILE + TILE / 2 - camY;
                const flicker = Math.sin(time * 10 + obj.x * 5) * 3;
                const gradient = renderer.ctx.createRadialGradient(sx, sy - 6, 0, sx, sy - 6, 50 + flicker);
                gradient.addColorStop(0, "rgba(255, 160, 40, 0.15)");
                gradient.addColorStop(1, "rgba(255, 100, 20, 0)");
                renderer.ctx.fillStyle = gradient;
                renderer.ctx.beginPath();
                renderer.ctx.arc(sx, sy - 6, 50 + flicker, 0, Math.PI * 2);
                renderer.ctx.fill();
            }
        });

        dialogue.draw(renderer.ctx, GAME_W, GAME_H);

        renderer.drawHUD(renderer.ctx, player, { currentRoom: currentRoomKey, roomName: currentRoom.name, memoryFragments: hState.memoryFragments }, GAME_W);

        renderer.drawMinimap(renderer.ctx, ROOMS, currentRoomKey, player.x, player.y, GAME_W);

        if (pendingMessage && messageTimer > 0) {
            const alpha = Math.min(1, messageTimer);
            renderer.ctx.globalAlpha = alpha;
            renderer.ctx.fillStyle = "rgba(8, 6, 18, 0.85)";
            renderer.ctx.beginPath();
            renderer.ctx.roundRect(GAME_W / 2 - 120, GAME_H / 2 - 20, 240, 40, 8);
            renderer.ctx.fill();
            renderer.ctx.fillStyle = "#c9a84c";
            renderer.ctx.font = "11px Inter, sans-serif";
            renderer.ctx.textAlign = "center";
            renderer.ctx.fillText(pendingMessage, GAME_W / 2, GAME_H / 2 + 4);
            renderer.ctx.textAlign = "start";
            renderer.ctx.globalAlpha = 1;
        }

        renderer.drawTransition(renderer.ctx, transitionAlpha, GAME_W, GAME_H);

        const chapter = Arq.getChapterForLevel ? Arq.getChapterForLevel(globalState.level || 1) : null;
        if (chapterEl && chapter) {
            chapterEl.textContent = chapter.name;
        }
    }

    function gameLoop(timestamp) {
        if (!running) return;
        const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
        lastTime = timestamp;

        update(dt);
        render(timestamp / 1000);

        animFrame = requestAnimationFrame(gameLoop);
    }

    function start() {
        if (running) return;
        running = true;
        gameStarted = true;
        lastTime = performance.now();
        initRoom();
        animFrame = requestAnimationFrame(gameLoop);
    }

    function stop() {
        running = false;
        gameStarted = false;
        if (animFrame) cancelAnimationFrame(animFrame);
        input.destroy();
        saveObjectStates();
    }

    return { start, stop };
}

function initHistoryModule() {
    const container = document.getElementById("history");
    if (!container) return;

    if (gameInstance) {
        gameInstance.stop();
        gameInstance = null;
    }

    const globalState = window.Arquimago?.state;
    if (!globalState) return;

    gameInstance = createGame(container, globalState);
    gameInstance.start();
}

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("history");
    if (container) {
        setTimeout(() => initHistoryModule(), 100);
    }
});

if (window.Arquimago) {
    window.Arquimago.renderHistory = initHistoryModule;
}

document.addEventListener("history-progress", () => {
    setTimeout(() => initHistoryModule(), 200);
});
