const QUESTS = {
    find_first_fragment: {
        id: "find_first_fragment",
        name: "Despertar do Arquimago",
        desc: "Encontre o primeiro cristal de memória na Clareira.",
        reward: { xp: 30, message: "Memória restaurada!" },
        completed: false,
    },
    help_lost_spirit: {
        id: "help_lost_spirit",
        name: "O Espírito Perdido",
        desc: "Encontre 3 cristais de memória na Floresta dos Sussurros.",
        reward: { xp: 50, message: "O espírito encontra paz." },
        requiredFragments: 3,
        completed: false,
    },
    crystal_puzzle: {
        id: "crystal_puzzle",
        name: "Segredos da Caverna",
        desc: "Ative a alavanca e abra o portão na Caverna dos Cristais.",
        reward: { xp: 40, message: "A caverna revela seus segredos." },
        requires: ["cg_lever1"],
        completed: false,
    },
    ruins_puzzle: {
        id: "ruins_puzzle",
        name: "Mistérios de Asterion",
        desc: "Ative as duas alavancas nas Ruínas de Asterion.",
        reward: { xp: 60, message: "As ruínas despertam." },
        requires: ["ra_lever1", "ra_lever2"],
        completed: false,
    },
    collect_all_fragments: {
        id: "collect_all_fragments",
        name: "O Arquimago Renascido",
        desc: "Encontre todos os 8 fragmentos de memória.",
        reward: { xp: 200, message: "Os poderes do Arquimago são restaurados!" },
        requiredFragments: 8,
        completed: false,
    },
    defeat_boss: {
        id: "defeat_boss",
        name: "Guardião das Sombras",
        desc: "Derrote o Guardião Sombrio no Templo.",
        reward: { xp: 150, message: "As sombras se dissipam." },
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
