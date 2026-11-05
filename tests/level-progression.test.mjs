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
    it("usa a média de XP das missões nativas para dimensionar a barra", () => {
        const state = normalizedState();

        assert.equal(Arquimago.getAverageMissionXp(state), 29);
        assert.ok(Arquimago.MISSIONS.daily.every(mission => mission.xp >= 10 && mission.xp <= 100));
        assert.ok(Arquimago.getDailyMissionXpPotential(state) >= 300);
        assert.ok(Arquimago.getDailyMissionXpPotential(state) <= 310);
        assert.equal(Arquimago.getLevelXpRequirement(state, 1), 73);
        assert.equal(Arquimago.getLevelXpRequirement(state, 2), 97);
        assert.ok(Arquimago.getLevelXpRequirement(state, 2) <= Arquimago.getAverageMissionXp(state) * 4);
    });
    it("mantém o começo rápido e preserva o XP excedente ao subir níveis", () => {
        const state = normalizedState();
        state.xp = Arquimago.getLevelXpRequirement(state, 1) + Arquimago.getLevelXpRequirement(state, 2) + 15;

        const result = Arquimago.applyPendingLevelUps(state);

        assert.equal(result.gained, 2);
        assert.equal(state.level, 3);
        assert.equal(state.xp, 15);
    });

    it("leva do nível 2 ao 3 com quatro missões nativas de XP médio no início", () => {
        const state = normalizedState();
        state.level = 2;
        state.xp = 0;
        state.xp = [20, 25, 35, 40].reduce((total, xp) => total + xp, state.xp);

        const result = Arquimago.applyPendingLevelUps(state);

        assert.equal(result.gained, 1);
        assert.equal(state.level, 3);
        assert.equal(state.xp, 23);
    });

    it("reverte XP, levels e totais diários quando a missão é desmarcada", () => {
        const state = normalizedState();
        state.level = 3;
        state.xp = 15;
        const xpToRevoke = 15 + Arquimago.getLevelXpRequirement(state, 2) + Arquimago.getLevelXpRequirement(state, 1);
        state.totalXP = xpToRevoke;
        state.dailyXP = xpToRevoke;
        state.monthlyXP = xpToRevoke;
        state.dailyDate = "2026-06-01";
        state.monthlyKey = "2026-06";
        Arquimago.state = state;
        Arquimago.getTodayKey = () => state.dailyDate;
        Arquimago.saveState = () => {};

        Arquimago.revokeXP(xpToRevoke, state.dailyDate);

        assert.equal(state.level, 1);
        assert.equal(state.xp, 0);
        assert.equal(state.totalXP, 0);
        assert.equal(state.dailyXP, 0);
        assert.equal(state.monthlyXP, 0);
    });

    it("recalibra a barra pelas missões personalizadas sem perder a porcentagem", () => {
        const state = normalizedState();
        state.xp = 15;
        const oldRequirement = Arquimago.getLevelXpRequirement(state, 1);
        const oldPercent = state.xp / oldRequirement;
        state.customMissions.push({
            id: "custom_extra",
            name: "Missão personalizada",
            xp: 85,
            frequency: "daily",
            attribute: "vitality"
        });

        Arquimago.refreshMissionAvailability(state);

        assert.equal(state.levelMissionXpBasis, 375 / 11);
        assert.equal(Arquimago.getLevelXpRequirement(state, 1), 86);
        assert.ok(Math.abs((state.xp / Arquimago.getLevelXpRequirement(state, 1)) - oldPercent) < 0.02);
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

        assert.equal(state.levelMissionXpBasis, 35.5);
        assert.equal(Arquimago.clampMissionXp(1000), 100);
        assert.equal(Arquimago.clampMissionXp(0), 10);
    });

    it("não aumenta a dificuldade só porque a pessoa adicionou mais missões com XP médio igual", () => {
        const state = normalizedState();
        const initialRequirement = Arquimago.getLevelXpRequirement(state, 2);
        for (let index = 0; index < 10; index += 1) {
            state.customMissions.push({
                id: `custom_${index}`,
                name: "Missão personalizada",
                xp: 29,
                frequency: "daily",
                attribute: "habits"
            });
        }

        Arquimago.refreshMissionAvailability(state);

        assert.equal(Arquimago.getAverageMissionXp(state), 29);
        assert.equal(Arquimago.getLevelXpRequirement(state, 2), initialRequirement);
    });

    it("aumenta a meta aos poucos após a primeira semana e o primeiro mês", () => {
        const state = normalizedState();
        state.daysUsingApp = 1;
        const startingRequirement = Arquimago.getLevelXpRequirement(state, 2);
        state.daysUsingApp = 7;
        const weekRequirement = Arquimago.getLevelXpRequirement(state, 2);
        state.daysUsingApp = 30;
        const monthRequirement = Arquimago.getLevelXpRequirement(state, 2);

        assert.ok(weekRequirement > startingRequirement);
        assert.ok(monthRequirement > weekRequirement);
    });

    it("sorteia uma missão bônus e mantém a escolha fixa durante o dia", () => {
        const state = normalizedState();
        const bonus = Arquimago.getDailyBonusMission(state);
        const bonusAgain = Arquimago.getDailyBonusMission(state);

        assert.ok(bonus);
        assert.equal(bonusAgain.mission.id, bonus.mission.id);
        assert.match(state.dailyBonusDate, /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(Arquimago.getDailyMissionBonusXp(bonus.mission, state), Math.max(10, Math.round(bonus.mission.xp * 0.5)));
    });

    it("migra a barra antiga mantendo aproximadamente o percentual já conquistado", () => {
        const state = createState();
        state.level = 2;
        state.levelMissionXpBasis = 170;
        state.xp = 40;

        Arquimago.normalizeState(state);

        assert.equal(state.levelProgressionVersion, Arquimago.LEVEL_PROGRESSION.version);
        assert.ok(Math.abs((state.xp / Arquimago.getLevelXpRequirement(state, 2)) - 0.5) < 0.02);
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
