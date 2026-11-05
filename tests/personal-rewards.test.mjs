import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import vm from "node:vm";

const projectRoot = new URL("../", import.meta.url);
const context = vm.createContext({ console, Date, Math });
context.window = context;

for (const file of ["js/config.js", "js/progression.js", "js/xp.js", "js/rewards.js"]) {
    const source = readFileSync(new URL(file, projectRoot), "utf8");
    vm.runInContext(source, context, { filename: file });
}

const Arquimago = context.Arquimago;

Arquimago.showXpPopup = () => {};
Arquimago.playXp = () => {};
Arquimago.playUnlock = () => {};
Arquimago.playClick = () => {};
Arquimago.showLevelUp = (level, gained, onDone) => { if (onDone) onDone(); };
Arquimago.getTodayKey = () => "2026-11-05";
Arquimago.getWeekKey = () => "2026-11-02";

const notifications = [];
Arquimago.showNotification = (message) => { notifications.push(message); };

let savedStates = 0;
Arquimago.saveState = () => { savedStates += 1; };

const createState = () => JSON.parse(JSON.stringify(Arquimago.DEFAULT_STATE));

function prepareState() {
    const state = createState();
    Arquimago.normalizeState(state);
    state.dailyDate = "2026-11-05";
    state.monthlyKey = "2026-11";
    Arquimago.state = state;
    return state;
}

function resetObservers() {
    savedStates = 0;
    notifications.length = 0;
}

describe("recompensas pessoais", () => {
    it("cria a recompensa com imagem e condição única", () => {
        const state = prepareState();
        resetObservers();

        const reward = Arquimago.createPersonalReward({
            name: "Noite de videogame",
            desc: "Maratona liberada",
            image: "data:image/jpeg;base64,AAAA",
            bonusXp: 25,
            conditions: [{ type: "nativeMission", missionId: "daily_meditacao", title: "Meditação" }]
        });

        assert.ok(reward);
        assert.match(reward.id, /^pRew_/);
        assert.equal(reward.bonusXp, 25);
        assert.equal(reward.image, "data:image/jpeg;base64,AAAA");
        assert.equal(reward.status, "pending");
        assert.equal(reward.conditions[0].missionId, "daily_meditacao");
        assert.equal(state.personalRewards.length, 1);
        assert.ok(savedStates > 0);
    });

    it("avalia condições múltiplas de forma independente", () => {
        prepareState();
        const reward = Arquimago.createPersonalReward({
            name: "Metas combinadas",
            bonusXp: 30,
            conditions: [
                { type: "missions", missionIds: ["daily_meditacao"], titles: { daily_meditacao: "Meditação" } },
                { type: "missionCount", target: 5 },
                { type: "xpTotal", target: 100 }
            ]
        });

        let statuses = Arquimago.getPersonalRewardStatuses(reward);
        assert.equal(statuses.length, 3);
        statuses.forEach(status => assert.equal(status.done, false));

        Arquimago.state.dailyDone.push("daily_meditacao");
        statuses = Arquimago.getPersonalRewardStatuses(reward);
        assert.equal(statuses[0].done, true);
        assert.equal(Arquimago.isPersonalRewardComplete(Arquimago.state, reward), false);
        assert.equal(reward.status, "pending");
    });

    it("desbloqueia automaticamente quando todas as condições são cumpridas", () => {
        const state = prepareState();
        resetObservers();
        const reward = Arquimago.createPersonalReward({
            name: "Conquista composta",
            bonusXp: 40,
            conditions: [
                { type: "missions", missionIds: ["daily_leitura"], titles: {} },
                { type: "streak", target: 3 }
            ]
        });
        assert.ok(reward);

        state.dailyDone.push("daily_leitura");
        state.streak = 3;
        const initialXP = state.totalXP;

        const unlocked = Arquimago.checkPersonalRewards("mission");

        assert.equal(unlocked.length, 1);
        assert.equal(reward.status, "unlocked");
        assert.equal(reward.unlock.trigger, "mission");
        assert.equal(reward.unlock.bonusXp, 40);
        assert.equal(reward.unlock.dayKey, "2026-11-05");
        assert.equal(state.totalXP, initialXP + 40);
        assert.ok(reward.unlock.conditions.every(item => item.done === true));
        assert.ok(savedStates > 0);
        assert.ok(notifications.some(message => message.indexOf("Conquista composta") !== -1));
    });

    it("concede o bônus de XP apenas uma vez mesmo com verificações repetidas", () => {
        const state = prepareState();
        resetObservers();
        const reward = Arquimago.createPersonalReward({
            name: "Bônus único",
            bonusXp: 50,
            conditions: [{ type: "dailyXp", target: 60 }]
        });

        state.dailyXP = 60;
        Arquimago.checkPersonalRewards("xp");
        const initialTotal = state.totalXP;

        Arquimago.checkPersonalRewards("xp");
        Arquimago.checkPersonalRewards("xp");

        assert.equal(state.totalXP, initialTotal);
        assert.equal(reward.status, "unlocked");
        assert.equal(reward.unlock.bonusXp, 50);
    });

    it("aplica level-up que venha do bônus e registra a celebração", () => {
        const state = prepareState();
        resetObservers();
        const reward = Arquimago.createPersonalReward({
            name: "Marcha ao nível",
            bonusXp: 100,
            conditions: [{ type: "xpTotal", target: 10 }]
        });

        state.totalXP = 90;
        state.xp = 90;
        const levelBefore = state.level;

        Arquimago.checkPersonalRewards("xp");

        assert.equal(reward.status, "unlocked");
        assert.ok(state.level > levelBefore);
        assert.ok(reward.unlock.levelUp.gained >= 1);
        assert.equal(reward.unlock.levelUp.gained, state.level - levelBefore);
    });

    it("limita o bônus mínimo e máximo de XP", () => {
        prepareState();
        const low = Arquimago.createPersonalReward({
            name: "Mínimo",
            bonusXp: 2,
            conditions: [{ type: "missionCount", target: 1 }]
        });
        const high = Arquimago.createPersonalReward({
            name: "Máximo",
            bonusXp: 999999,
            conditions: [{ type: "missionCount", target: 1 }]
        });

        assert.equal(low.bonusXp, 10);
        assert.equal(high.bonusXp, 100000);
    });

    it("mantém o registro permanente de recompensas conquistadas no Grimório", () => {
        const state = prepareState();
        resetObservers();
        const reward = Arquimago.createPersonalReward({
            name: "Registro permanente",
            bonusXp: 15,
            conditions: [{ type: "streak", target: 1 }]
        });
        state.streak = 1;
        Arquimago.checkPersonalRewards("mission");

        assert.equal(Arquimago.updatePersonalReward(reward.id, { name: "Hacked" }), null);
        assert.equal(Arquimago.deletePersonalReward(reward.id), false);
        assert.equal(reward.name, "Registro permanente");
        assert.equal(state.personalRewards.length, 1);

        assert.equal(Arquimago.archivePersonalRewardInGrimoire(reward.id), true);
        assert.equal(reward.archivedInGrimoire, true);
    });

    it("calcula XP semanal a partir do histórico e do dia corrente", () => {
        const state = prepareState();
        state.dailyHistory.push({ date: "2026-11-01", xp: 50 });
        state.dailyHistory.push({ date: "2026-11-03", xp: 40 });

        let weekly = Arquimago.getWeeklyXpTotalShared ? Arquimago.getWeeklyXpTotalShared(state) : undefined;
        if (weekly === undefined) {
            const snapshot = Arquimago.createPersonalReward({
                name: "Semana",
                bonusXp: 10,
                conditions: [{ type: "weeklyXp", target: 100 }]
            });
            weekly = Arquimago.getPersonalRewardStatuses(snapshot)[0].current;
        }

        assert.equal(weekly, 40);
    });

    it("normaliza o estado e descarta registros inválidos", () => {
        const state = prepareState();
        resetObservers();
        state.personalRewards = [
            null,
            42,
            { id: "", name: "Sem id", conditions: [] },
            {
                id: "pRew_test_1",
                name: "Válida",
                desc: 7,
                image: 9,
                bonusXp: "abc",
                conditions: [
                    { type: "xpTotal", target: "250" },
                    { type: "desconhecida", target: 5 },
                    { type: "missions", missionIds: ["x", 9, "y"] }
                ],
                status: "arquivada"
            },
            {
                id: "pRew_test_2",
                name: "Conquistada sem registro",
                bonusXp: 30,
                conditions: [{ type: "streak", target: 2 }],
                status: "unlocked"
            }
        ];

        Arquimago.normalizeState(state);
        const [valid, missingUnlock] = state.personalRewards;

        assert.equal(state.personalRewards.length, 2);
        assert.equal(valid.desc, "");
        assert.equal(valid.image, "");
        assert.equal(valid.bonusXp, 10);
        assert.equal(valid.status, "pending");
        assert.equal(valid.unlock, undefined);
        assert.equal(valid.conditions.length, 2);
        assert.equal(valid.conditions[0].target, 250);
        assert.equal(valid.conditions[1].missionIds.length, 2);
        assert.equal(missingUnlock.status, "unlocked");
        assert.ok(missingUnlock.unlock);
        assert.equal(missingUnlock.archivedInGrimoire, false);
    });
});
