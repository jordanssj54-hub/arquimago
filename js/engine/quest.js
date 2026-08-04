const QUESTS = {
    despertar: {
        id: "despertar",
        name: "O Despertar do Caçador",
        desc: "Colete 2 fragmentos de memória na Clareira do Despertar.",
        reward: { xp: 30, message: "A memória flui através de você." },
        requiredFragments: 2,
        completed: false,
    },
    descanso_taverna: {
        id: "descanso_taverna",
        name: "O Refúgio dos Esquecidos",
        desc: "Converse com os viajantes na Taverna e colete forças.",
        reward: { xp: 20, message: "O descanso renova o espírito." },
        completed: false,
    },
    sussurros_floresta: {
        id: "sussurros_floresta",
        name: "Os Sussurros da Floresta",
        desc: "Colete 5 fragmentos de memória na Floresta dos Sussurros.",
        reward: { xp: 50, message: "A floresta revela seus segredos." },
        requiredFragments: 5,
        completed: false,
    },
    cristais_sistema: {
        id: "cristais_sistema",
        name: "Revelação do Subsistema",
        desc: "Ative as duas alavancas na Caverna dos Cristais.",
        reward: { xp: 60, message: "O sistema se revela diante de você." },
        requires: ["c4_lever1", "c4_lever2"],
        completed: false,
    },
    final_asterion: {
        id: "final_asterion",
        name: "O Julgamento de Asterion",
        desc: "Derrote o Guardião Sombrio nas Ruínas de Asterion.",
        reward: { xp: 200, message: "A verdade de Asterion é sua." },
        completed: false,
    },
};

export function createQuestSystem() {
    const active = {};
    const completed = new Set();

    function init(savedQuests, savedCompleted) {
        for (const [k, v] of Object.entries(QUESTS)) {
            active[k] = { ...v };
        }
        if (savedCompleted) {
            savedCompleted.forEach(id => {
                completed.add(id);
                if (active[id]) active[id].completed = true;
            });
        }
    }

    function activate(questId) {
        if (active[questId] && !completed.has(questId)) {
            active[questId].activated = true;
        }
    }

    function check(gameState, leverStates) {
        const notifications = [];
        for (const [id, quest] of Object.entries(active)) {
            if (quest.completed || !quest.activated) continue;

            let done = false;

            if (quest.requiredFragments) {
                done = gameState.memoryFragments.length >= quest.requiredFragments;
            }

            if (quest.requires && leverStates) {
                done = quest.requires.every(reqId => leverStates[reqId]);
            }

            if (id === "defeat_boss") {
                done = gameState.bossDefeated || false;
            }

            if (done) {
                quest.completed = true;
                completed.add(id);
                notifications.push({
                    type: "quest_complete",
                    quest: quest,
                });
                if (quest.reward) {
                    notifications.push({
                        type: "quest_reward",
                        reward: quest.reward,
                    });
                }
            }
        }
        return notifications;
    }

    function getActive() {
        return Object.values(active).filter(q => q.activated && !q.completed);
    }

    function getCompleted() {
        return Object.values(active).filter(q => q.completed);
    }

    function getAll() {
        return Object.values(active);
    }

    function getCompletedIds() {
        return Array.from(completed);
    }

    return { init, activate, check, getActive, getCompleted, getAll, getCompletedIds };
}
