import { TILE, ROOMS, PHASES, getRoom, getPhaseForRoom } from "./engine/world.js";
import { createInputController } from "./engine/input.js";
import { createCamera } from "./engine/camera.js";
import { createParticleSystem } from "./engine/particles.js";
import { createRenderer } from "./engine/renderer.js";
import { createPlayer, updatePlayer, drawPlayer } from "./engine/player.js";
import { createDialogueSystem } from "./engine/dialogue.js";
import { createAudioManager } from "./engine/audio.js";
import { getNearbyEntity, interactWith, checkDoorExits } from "./engine/entities.js";

const GAME_W = 480;
const GAME_H = 320;

let gameInstance = null;

function buildMarkup() {
    return `
    <div class="history-page">
        <div class="history-shell">
            <div class="history-header">
                <h2>Jornada do Arquimago</h2>
                <div class="header-badges">
                    <span class="history-pill" id="hPhase"></span>
                    <span class="history-chapter-num" id="hChapterNum"></span>
                </div>
            </div>
            <div class="history-canvas-wrap">
                <canvas id="historyCanvas"></canvas>
                <div class="history-dialogue" id="history-dialogue"></div>
                <div class="history-mobile-controls" id="historyMobileControls"></div>
            </div>
            <div class="history-quest-bar" id="hQuestBar"></div>
            <div class="history-toast" id="hToast"></div>
        </div>
    </div>`;
}

function createGame(container, globalState, opts) {
    const Arq = window.Arquimago;
    const hState = globalState.history || {
        currentRoom: "floresta_arcana",
        currentPhase: 1,
        playerStartX: 10, playerStartY: 12,
        memoryFragments: [],
        chaptersCompleted: [],
        objectStates: {},
    };
    globalState.history = hState;
    window._historyState = hState;

    container.innerHTML = buildMarkup();

    const canvas = document.getElementById("historyCanvas");
    const mobileEl = document.getElementById("historyMobileControls");
    const dialogueEl = document.getElementById("history-dialogue");
    const phaseEl = document.getElementById("hPhase");
    const chapterNumEl = document.getElementById("hChapterNum");
    const questBarEl = document.getElementById("hQuestBar");
    const toastEl = document.getElementById("hToast");

    const input = createInputController(mobileEl);
    const renderer = createRenderer(canvas, GAME_W, GAME_H);
    const camera = createCamera(GAME_W, GAME_H);
    const particles = createParticleSystem();
    const dialogue = createDialogueSystem(dialogueEl);
    const audio = createAudioManager();

    const VALID_ROOMS = new Set(Object.keys(ROOMS));
    if (!VALID_ROOMS.has(hState.currentRoom)) {
        hState.currentRoom = "floresta_arcana";
        hState.currentPhase = 1;
        hState.playerStartX = 10;
        hState.playerStartY = 12;
    }
    let currentRoomKey = hState.currentRoom;
    let currentRoom = getRoom(currentRoomKey);
    if (!currentRoom) {
        currentRoomKey = "floresta_arcana";
        currentRoom = getRoom(currentRoomKey);
    }
    let player = createPlayer(10, 12);
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

    const PHASE_ORDER = ["floresta_arcana", "ruinas_antigas", "entrada_masmorra"];

    function initRoom() {
        currentRoom = getRoom(currentRoomKey);
        if (!currentRoom) return;

        hState.currentRoom = currentRoomKey;

        if (currentRoom.phase) {
            const phaseIdx = PHASE_ORDER.indexOf(currentRoom.phase);
            if (phaseIdx >= 0) {
                hState.currentPhase = phaseIdx + 1;
                globalState.chapter = phaseIdx + 1;
            }
        }

        roomObjects = (currentRoom.objects || []).map(o => ({ ...o }));
        roomNpcs = currentRoom.npcs || [];

        roomObjects.forEach(o => {
            const saved = hState.objectStates[o.id];
            if (saved) {
                if (o.type === "chest") o.opened = saved.opened || false;
                if (o.type === "potion") o.collected = saved.collected || false;
                if (o.type === "plant") o.collected = saved.collected || false;
            }
        });

        const px = (hState.playerStartX || 10) * TILE + TILE / 2;
        const py = (hState.playerStartY || 12) * TILE + TILE / 2;
        player.x = px;
        player.y = py;

        camera.snapTo(px, py, currentRoom.width * TILE, currentRoom.height * TILE);

        updateHeader();
        updateQuestBar();
    }

    function saveObjectStates() {
        roomObjects.forEach(o => {
            if (o.type === "chest" || o.type === "potion" || o.type === "plant") {
                hState.objectStates[o.id] = {
                    opened: o.opened,
                    collected: o.collected,
                };
            }
        });
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
        if (dialogue.isActive()) return;

        const entity = getNearbyEntity(player.x, player.y, { npcs: roomNpcs, objects: roomObjects }, 44);
        if (!entity) return;

        const result = interactWith(entity, hState, player);
        if (!result) return;

        switch (result.type) {
            case "dialogue":
                dialogue.start(result.entity.dialogue, () => {
                    checkPhaseAdvancement();
                });
                audio.playDialogue();
                break;

            case "memory_fragment":
                particles.emitMagic(player.x, player.y, result.entity.color || "#7b68ee");
                audio.playPickup();
                showNotification(result.message);
                updateHeader();
                updateQuestBar();
                checkPhaseAdvancement();
                break;

            case "chest":
                particles.emitBurst(player.x, player.y, "#c9a84c", 15);
                audio.playChest();
                if (result.contains === "memory_fragment") {
                    if (!hState.memoryFragments.includes(result.entity.id)) {
                        hState.memoryFragments.push(result.entity.id);
                    }
                    showNotification("Fragmento de memória encontrado!");
                } else if (result.contains === "mana_shard") {
                    showNotification("Capacidade de mana aumentada!");
                } else {
                    showNotification("Baú aberto!");
                }
                saveObjectStates();
                updateHeader();
                updateQuestBar();
                checkPhaseAdvancement();
                break;

            case "potion":
                particles.emitBurst(player.x, player.y, result.entity.color || "#ff4444", 10);
                audio.playPickup();
                showNotification(result.message);
                saveObjectStates();
                break;

            case "book":
                dialogue.start([
                    { speaker: result.title || "Livro", text: result.text }
                ]);
                audio.playDialogue();
                break;

            case "monument":
                dialogue.start([
                    { speaker: "Monumento Antigo", text: "Uma inscrição antiga pulsa com luz própria..." },
                    { speaker: "Monumento Antigo", text: "\"O caçador que busca o poder encontrará apenas o vazio.\"" },
                    { speaker: "Monumento Antigo", text: "\"A verdadeira força nasce da aceitação da própria fragilidade.\"" },
                ]);
                audio.playPickup();
                break;

            case "altar":
                dialogue.start([
                    { speaker: "Altar Ancestral", text: "O altar vibra com energia residual..." },
                    { speaker: "Altar Ancestral", text: "\"Aqui os primeiros arquimagos ofereceram suas almas em troca de conhecimento.\"" },
                    { speaker: "Altar Ancestral", text: "\"O preço da sabedoria é sempre a inocência.\"" },
                ]);
                audio.playPickup();
                break;

            case "ancient_stone":
                dialogue.start([
                    { speaker: "Pedra Antiga", text: "Uma inscrição quase ilegível está gravada na pedra..." },
                    { speaker: "Pedra Antiga", text: "\"O sistema observa. O sistema registra. O sistema julga.\"" },
                    { speaker: "Pedra Antiga", text: "\"Ninguém escapa do julgamento. Nem mesmo o criador.\"" },
                ]);
                audio.playPickup();
                break;

            case "plant":
                particles.emitBurst(player.x, player.y, "#44aa44", 8);
                audio.playPickup();
                showNotification(result.message);
                saveObjectStates();
                break;

            case "portal":
                dialogue.start([
                    { speaker: "Portal", text: "O portal pulsa com energia ancestral." },
                    { speaker: "Portal", text: "Atravessá-lo significa avançar para a próxima etapa de sua jornada." },
                ], () => {
                    checkPhaseAdvancement();
                });
                audio.playMagic();
                break;

            case "lever":
                audio.playDoor();
                particles.emitBurst(result.entity.x * TILE + TILE / 2, result.entity.y * TILE + TILE / 2, result.activated ? "#44cc44" : "#cc4444", 12);
                showNotification(result.activated ? "Mecanismo ativado!" : "Mecanismo desativado!");
                saveObjectStates();
                break;

            case "rest":
                showNotification(result.message, "#44cc44");
                break;

            case "already_interacted":
                showNotification(result.message);
                break;
        }
    }

    function checkPhaseAdvancement() {
        const fragCount = hState.memoryFragments.length;
        const currentPhase = hState.currentPhase || 1;

        if (currentPhase === 1 && fragCount >= 2 && !hState.chaptersCompleted.includes(1)) {
            hState.chaptersCompleted.push(1);
            showToast("Floresta Arcana concluída! Ruínas Antigas desbloqueadas.", "#44cc44");
            saveState();
        }
        if (currentPhase === 2 && fragCount >= 4 && !hState.chaptersCompleted.includes(2)) {
            hState.chaptersCompleted.push(2);
            showToast("Ruínas Antigas concluídas! Entrada da Masmorra desbloqueada.", "#44cc44");
            saveState();
        }
        if (currentPhase === 3 && fragCount >= 6 && !hState.chaptersCompleted.includes(3)) {
            hState.chaptersCompleted.push(3);
            showToast("Jornada completa! Você é o Arquimago.", "#ffcc00");
            saveState();
        }
    }

    function updateHeader() {
        if (!phaseEl) return;
        const phase = getPhaseForRoom(currentRoomKey);
        if (phaseEl && phase) {
            phaseEl.textContent = phase.name;
        }
        if (chapterNumEl) {
            chapterNumEl.textContent = "CAP. " + (hState.currentPhase || 1);
        }
    }

    function updateQuestBar() {
        if (!questBarEl) return;
        const fragCount = hState.memoryFragments.length;
        const phase = hState.currentPhase || 1;
        const phaseName = getPhaseForRoom(currentRoomKey)?.name || "Desconhecido";
        questBarEl.innerHTML = `
            <div class="history-quest-item">&#9733; ${phaseName} — Fragmentos: ${fragCount}</div>
            <div class="history-quest-empty">Explore o mundo para encontrar fragmentos de memória</div>
        `;
    }

    function getInputDirection() {
        const i = input.state;
        const dx = i.ax || 0;
        const dy = i.ay || 0;
        return {
            left: dx < -0.3,
            right: dx > 0.3,
            up: dy < -0.3,
            down: dy > 0.3,
        };
    }

    function update(dt) {
        if (!gameStarted || !currentRoom) return;

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

        const jp = input.consumeJustPressed();
        if (jp.special || jp.action) {
            handleInteraction();
        }

        const dir = getInputDirection();
        updatePlayer(player, dir, dt, currentRoom, () => {
            audio.playStep();
        });

        camera.follow(player.x, player.y, currentRoom.width * TILE, currentRoom.height * TILE);
        camera.update(dt);

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

        if (messageTimer > 0) {
            messageTimer -= dt;
            if (messageTimer <= 0) pendingMessage = null;
        }
    }

    function render(time) {
        if (!currentRoom) {
            renderer.clear(null, time);
            return;
        }

        renderer.clear(currentRoom, time);

        const camX = camera.getX();
        const camY = camera.getY();

        renderer.drawRoom(currentRoom, camX, camY, time);

        roomObjects.forEach(obj => {
            renderer.drawObject(renderer.ctx, obj, camX, camY, time);
        });

        roomNpcs.forEach(npc => {
            renderer.drawNPC(renderer.ctx, npc, camX, camY, time);
        });

        drawPlayer(renderer.ctx, player, camX, camY, time);

        particles.draw(renderer.ctx, camX, camY);

        roomObjects.forEach(obj => {
            if (obj.type === "torch" && obj.lit) {
                const sx = obj.x * TILE + TILE / 2 - camX;
                const sy = obj.y * TILE + TILE / 2 - camY;
                const flicker = Math.sin(time * 10 + obj.x * 5) * 3;
                try {
                    const gradient = renderer.ctx.createRadialGradient(sx, sy - 6, 0, sx, sy - 6, 50 + flicker);
                    gradient.addColorStop(0, "rgba(255, 160, 40, 0.15)");
                    gradient.addColorStop(1, "rgba(255, 100, 20, 0)");
                    renderer.ctx.fillStyle = gradient;
                    renderer.ctx.beginPath();
                    renderer.ctx.arc(sx, sy - 6, 50 + flicker, 0, Math.PI * 2);
                    renderer.ctx.fill();
                } catch (e) {}
            }
        });

        renderer.drawHUD(renderer.ctx, player, {
            currentRoom: currentRoomKey,
            roomName: currentRoom.name,
            memoryFragments: hState.memoryFragments,
            chapter: hState.currentPhase,
            chaptersCompleted: hState.chaptersCompleted,
            level: hState.currentPhase || 1,
        }, GAME_W);

        renderer.drawMinimap(renderer.ctx, PHASES, currentRoom.phase, GAME_W);

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
    }

    function gameLoop(timestamp) {
        if (!running) return;
        try {
            const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
            lastTime = timestamp;
            update(dt);
            render(timestamp / 1000);
        } catch (e) {
            console.error("[History] Game loop error:", e);
        }
        animFrame = requestAnimationFrame(gameLoop);
    }

    function start() {
        if (running) return;
        running = true;
        gameStarted = true;
        lastTime = performance.now();
        initRoom();
        animFrame = requestAnimationFrame(gameLoop);

        if (opts && opts.triggerInitialDialogue) {
            const firstNpc = roomNpcs[0];
            if (firstNpc && firstNpc.dialogue) {
                setTimeout(() => {
                    dialogue.start(firstNpc.dialogue);
                    audio.playDialogue();
                }, 700);
            }
        }

        showToast("WASD: Mover  E: Interagir", "#888");
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

    const showIntro = !globalState.historyIntroSeen;

    function startGame(triggerDialogue) {
        gameInstance = createGame(container, globalState, {
            triggerInitialDialogue: triggerDialogue
        });
        gameInstance.start();
    }

    if (showIntro) {
        Arquimago.createHistoryIntro(() => {
            globalState.historyIntroSeen = true;
            try {
                if (Arquimago.saveState) Arquimago.saveState(globalState);
            } catch (e) {}
            startGame(true);
        });
    } else {
        startGame(false);
    }
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
