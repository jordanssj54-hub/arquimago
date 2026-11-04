import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import vm from "node:vm";

const projectRoot = new URL("../", import.meta.url);
const context = vm.createContext({ console, Date, Math });
context.window = context;

for (const file of ["js/config.js", "js/progression.js", "js/xp.js"]) {
    const source = readFileSync(new URL(file, projectRoot), "utf8");
    vm.runInContext(source, context, { filename: file });
}

const Arquimago = context.Arquimago;
const createState = () => JSON.parse(JSON.stringify(Arquimago.DEFAULT_STATE));

function normalizedState() {
    const state = createState();
    Arquimago.normalizeState(state);
    return state;
}

describe("progressão adaptativa por XP", () => {
    it("usa os 85 XP diários das missões nativas como referência", () => {
        const state = normalizedState();

        assert.equal(Arquimago.getDailyMissionXpPotential(state), 85);
        assert.equal(Arquimago.getLevelXpRequirement(state, 1), 30);
        assert.equal(Arquimago.getLevelXpRequirement(state, 2), 40);
    });
    it("permite subir vários levels e preserva o XP excedente", () => {
        const state = normalizedState();
        state.xp = 85;

        const result = Arquimago.applyPendingLevelUps(state);

        assert.equal(result.gained, 2);
        assert.equal(state.level, 3);
        assert.equal(state.xp, 15);
    });

    it("reverte XP, levels e totais diários quando a missão é desmarcada", () => {
        const state = normalizedState();
        state.level = 3;
        state.xp = 15;
        state.totalXP = 85;
        state.dailyXP = 85;
        state.monthlyXP = 85;
        state.dailyDate = "2026-06-01";
        state.monthlyKey = "2026-06";
        Arquimago.state = state;
        Arquimago.getTodayKey = () => state.dailyDate;
        Arquimago.saveState = () => {};

        Arquimago.revokeXP(85, state.dailyDate);

        assert.equal(state.level, 1);
        assert.equal(state.xp, 0);
        assert.equal(state.totalXP, 0);
        assert.equal(state.dailyXP, 0);
        assert.equal(state.monthlyXP, 0);
    });

    it("recalibra os requisitos pela configuração ativa sem perder a porcentagem da barra", () => {
        const state = normalizedState();
        state.xp = 15;
        state.customMissions.push({
            id: "custom_extra",
            name: "Missão personalizada",
            xp: 85,
            frequency: "daily",
            attribute: "vitality"
        });

        Arquimago.refreshMissionAvailability(state);

        assert.equal(state.levelMissionXpBasis, 170);
        assert.equal(Arquimago.getLevelXpRequirement(state, 1), 60);
        assert.equal(state.xp, 30);
    });

    it("ignora missões ocultas no cálculo e limita o XP personalizado", () => {
        const state = normalizedState();
        state.customMissions.push({
            id: "custom_extra",
            name: "Missão personalizada",
            xp: 85,
            frequency: "daily",
            attribute: "vitality"
        });
        Arquimago.refreshMissionAvailability(state);
        state.hiddenMissionIds.push("daily_meditacao");
        Arquimago.refreshMissionAvailability(state);

        assert.equal(state.levelMissionXpBasis, 160);
        assert.equal(Arquimago.clampMissionXp(1000), 100);
        assert.equal(Arquimago.clampMissionXp(0), 1);
    });

    it("mantém o level máximo em um bilhão", () => {
        const state = normalizedState();
        state.level = Arquimago.LEVEL_PROGRESSION.maxLevel;
        state.xp = 100;

        const result = Arquimago.applyPendingLevelUps(state);

        assert.equal(result.gained, 0);
        assert.equal(state.level, 1000000000);
        assert.equal(state.xp, 100);
        assert.equal(Arquimago.getLevelXpRequirement(state, state.level), 0);
    });

    it("migra os quatro atributos antigos para Físico, Mental e Hábitos sem perder progresso", () => {
        const state = normalizedState();
        state.attributes = {
            strength: { total: 6 },
            vitality: { total: 4 },
            intelligence: { total: 7 },
            spirit: { total: 8 }
        };
        state.customMissions.push({
            id: "custom_legacy",
            name: "Missão antiga",
            xp: 4,
            frequency: "daily",
            attribute: "intelligence"
        });

        Arquimago.normalizeState(state);

        assert.deepEqual(Object.keys(state.attributes).sort(), ["habits", "mental", "physical"]);
        assert.equal(state.attributes.physical.total, 10);
        assert.equal(state.attributes.mental.total, 7);
        assert.equal(state.attributes.habits.total, 8);
        assert.equal(state.customMissions[0].attribute, "mental");
    });
});
