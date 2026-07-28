import { TILE } from "./world.js";

export function getNearbyEntity(px, py, room, interactRadius) {
    const r = interactRadius || 40;
    let closest = null;
    let closestDist = Infinity;

    const allEntities = [
        ...(room.npcs || []).map(n => ({ ...n, _kind: "npc" })),
        ...(room.objects || []).map(o => ({ ...o, _kind: "object" })),
    ];

    for (const e of allEntities) {
        const ex = e.x * TILE + TILE / 2;
        const ey = e.y * TILE + TILE / 2;
        const dist = Math.sqrt((px - ex) ** 2 + (py - ey) ** 2);
        if (dist < r && dist < closestDist) {
            closest = e;
            closestDist = dist;
        }
    }

    return closest;
}

export function interactWith(entity, gameState, player) {
    if (!entity) return null;

    if (entity._kind === "npc") {
        return { type: "dialogue", entity };
    }

    if (entity._kind === "object") {
        switch (entity.type) {
            case "crystal":
                if (!gameState.memoryFragments.includes(entity.id)) {
                    gameState.memoryFragments.push(entity.id);
                    return { type: "memory_fragment", entity, message: "Um fragmento de memória foi restaurado!" };
                }
                return { type: "already_interacted", message: "O cristal já foi purificado." };

            case "chest":
                if (entity.opened) return { type: "already_interacted", message: "O baú já foi aberto." };
                entity.opened = true;
                return { type: "chest", entity, contains: entity.contains };

            case "potion":
                if (entity.collected) return { type: "already_interacted", message: "Já coletado." };
                entity.collected = true;
                if (entity.color === "#ff4444") {
                    player.hp = Math.min(player.maxHp, player.hp + 30);
                    return { type: "potion", message: "+30 HP!" };
                } else if (entity.color === "#4488ff") {
                    player.mana = Math.min(player.maxMana, player.mana + 30);
                    return { type: "potion", message: "+30 MP!" };
                }
                return { type: "potion", message: "Poção coletada!" };

            case "book":
                return { type: "book", entity, title: entity.title, text: entity.text };

            case "lever":
                entity.activated = !entity.activated;
                return { type: "lever", entity, activated: entity.activated };

            case "monument":
                return { type: "monument", entity };

            default:
                return null;
        }
    }

    return null;
}

export function checkDoorExits(room, px, py, playerW, playerH) {
    const hw = (playerW || 20) / 2;
    const hh = (playerH || 20) / 2;

    for (const exit of (room.exits || [])) {
        const ex = exit.x * TILE;
        const ey = exit.y * TILE;
        const ew = exit.w * TILE;
        const eh = exit.h * TILE;

        if (px - hw < ex + ew && px + hw > ex && py - hh < ey + eh && py + hh > ey) {
            if (exit.requires_fragments && (!window._historyState || window._historyState.memoryFragments.length < exit.requires_fragments)) {
                return { blocked: true, message: "Precisa de " + exit.requires_fragments + " fragmentos de memória." };
            }
            if (exit.requires) {
                const reqs = Array.isArray(exit.requires) ? exit.requires : [exit.requires];
                const allMet = reqs.every(reqId => {
                    const obj = room.objects.find(o => o.id === reqId);
                    return obj && obj.activated;
                });
                if (!allMet) {
                    return { blocked: true, message: "Alguns mecanismos ainda estão inativos." };
                }
            }
            return { exit };
        }
    }
    return null;
}
