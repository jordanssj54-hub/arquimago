(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};
    var RANKS = [
        { id: "D", min: 0 },
        { id: "C", min: 70 },
        { id: "B", min: 80 },
        { id: "A", min: 90 },
        { id: "S", min: 100 }
    ];

    function todayKey() {
        if (Arquimago.getTodayKey) return Arquimago.getTodayKey();
        return new Date().toISOString().slice(0, 10);
    }

    function weekKey() {
        if (Arquimago.getWeekKey) return Arquimago.getWeekKey();
        var d = new Date();
        var day = d.getDay();
        var diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d.toISOString().slice(0, 10);
    }

    function validAttribute(key) {
        return !!(Arquimago.ATTRIBUTE_DEFINITIONS && Arquimago.ATTRIBUTE_DEFINITIONS[key]);
    }

    function validRank(rank) {
        return RANKS.some(function (item) { return item.id === rank; });
    }

    function doneArray(state, type) {
        if (type === "main" || type === "custom_free") return state.completedIds;
        if (type === "daily" || type === "custom_daily") return state.dailyDone;
        if (type === "habits") return state.habitsDone;
        if (type === "weekly" || type === "custom_weekly") return state.weeklyDone;
        return [];
    }

    function isDoneInType(state, mission, type) {
        var list = doneArray(state, type);
        return list.indexOf(mission.id) !== -1;
    }

    function allNativeMissions() {
        var result = [];
        ["main", "daily", "weekly", "habits"].forEach(function (type) {
            (Arquimago.MISSIONS[type] || []).forEach(function (mission) {
                result.push({ mission: mission, type: type });
            });
        });
        return result;
    }

    Arquimago.isMissionHidden = function (state, missionId) {
        state = state || Arquimago.state;
        return !!(state && Array.isArray(state.hiddenMissionIds) && state.hiddenMissionIds.indexOf(missionId) !== -1);
    };

    Arquimago.isMissionDeleted = function (state, missionId) {
        state = state || Arquimago.state;
        return !!(state && Array.isArray(state.deletedMissionIds) && state.deletedMissionIds.indexOf(missionId) !== -1);
    };

    Arquimago.isMissionSuppressed = function (state, missionId) {
        return Arquimago.isMissionHidden(state, missionId) || Arquimago.isMissionDeleted(state, missionId);
    };

    Arquimago.hideMission = function (state, missionId) {
        state = state || Arquimago.state;
        if (!state || Arquimago.isMissionDeleted(state, missionId)) return;
        if (!Array.isArray(state.hiddenMissionIds)) state.hiddenMissionIds = [];
        if (state.hiddenMissionIds.indexOf(missionId) === -1) state.hiddenMissionIds.push(missionId);
        Arquimago.saveState(state);
    };

    Arquimago.restoreMission = function (state, missionId) {
        state = state || Arquimago.state;
        if (!state || !Array.isArray(state.hiddenMissionIds)) return;
        state.hiddenMissionIds = state.hiddenMissionIds.filter(function (id) { return id !== missionId; });
        Arquimago.saveState(state);
    };

    Arquimago.deleteNativeMission = function (state, missionId) {
        state = state || Arquimago.state;
        if (!state) return;
        if (!Array.isArray(state.deletedMissionIds)) state.deletedMissionIds = [];
        state.hiddenMissionIds = Array.isArray(state.hiddenMissionIds) ? state.hiddenMissionIds.filter(function (id) { return id !== missionId; }) : [];
        if (state.deletedMissionIds.indexOf(missionId) === -1) state.deletedMissionIds.push(missionId);
        Arquimago.saveState(state);
    };

    Arquimago.getAllMissionEntries = function (state, includeSuppressed) {
        state = state || Arquimago.state;
        var entries = allNativeMissions();
        (state && state.customMissions || []).forEach(function (mission) {
            entries.push({
                mission: mission,
                type: Arquimago.getCustomTypeForFrequency ? Arquimago.getCustomTypeForFrequency(mission.frequency) : "custom_daily"
            });
        });
        if (includeSuppressed) return entries;
        return entries.filter(function (entry) {
            return !Arquimago.isMissionSuppressed(state, entry.mission.id);
        });
    };

    Arquimago.findMissionByType = function (type, id) {
        var entries = Arquimago.getAllMissionEntries(Arquimago.state, true);
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].type === type && entries[i].mission.id === id) return entries[i].mission;
        }
        return null;
    };

    Arquimago.getDailyMissionEntries = function (state) {
        state = state || Arquimago.state;
        if (!state) return [];
        return Arquimago.getAllMissionEntries(state).filter(function (entry) {
            return entry.type === "daily" || entry.type === "habits" || entry.type === "custom_daily";
        });
    };

    Arquimago.getRankForPercentage = function (percent) {
        var rank = RANKS[0].id;
        RANKS.forEach(function (item) {
            if (percent >= item.min) rank = item.id;
        });
        return rank;
    };

    Arquimago.getRankMinimum = function (rank) {
        for (var i = 0; i < RANKS.length; i++) {
            if (RANKS[i].id === rank) return RANKS[i].min;
        }
        return 0;
    };

    Arquimago.getNextRank = function (rank) {
        for (var i = 0; i < RANKS.length; i++) {
            if (RANKS[i].id === rank) return RANKS[i + 1] || null;
        }
        return RANKS[1];
    };

    Arquimago.getDailyRankData = function (state) {
        state = state || Arquimago.state;
        var entries = Arquimago.getDailyMissionEntries(state);
        var completed = entries.filter(function (entry) {
            return isDoneInType(state, entry.mission, entry.type);
        }).length;
        var total = entries.length;
        var percent = total ? Math.round((completed / total) * 100) : 0;
        var rank = Arquimago.getRankForPercentage(percent);
        var next = Arquimago.getNextRank(rank);
        var missionsToNext = 0;

        if (next) {
            missionsToNext = Math.max(0, Math.ceil((next.min / 100) * total) - completed);
            if (missionsToNext === 0 && percent < next.min) missionsToNext = 1;
        }

        return {
            completed: completed,
            total: total,
            remaining: Math.max(0, total - completed),
            percent: percent,
            rank: rank,
            nextRank: next ? next.id : null,
            nextMinimum: next ? next.min : 100,
            missionsToNext: missionsToNext,
            isComplete: total > 0 && completed === total
        };
    };

    Arquimago.updateDailyRank = function (state) {
        state = state || Arquimago.state;
        if (!state) return Arquimago.getDailyRankData(state);
        var data = Arquimago.getDailyRankData(state);
        var currentBest = validRank(state.bestDailyRank) ? state.bestDailyRank : "D";
        var bestMinimum = Arquimago.getRankMinimum(currentBest);
        if (data.percent > (state.bestDailyRankPercent || 0) || Arquimago.getRankMinimum(data.rank) > bestMinimum) {
            state.bestDailyRank = data.rank;
            state.bestDailyRankPercent = data.percent;
        }
        return data;
    };

    Arquimago.getAttributeRequirement = function (level) {
        return 50 + (Math.max(1, level) - 1) * 25;
    };

    function calculateAttribute(total) {
        var remaining = Math.max(0, Math.floor(Number(total) || 0));
        var level = 1;
        var requirement = Arquimago.getAttributeRequirement(level);
        var guard = 0;
        while (remaining >= requirement && guard < 1000) {
            remaining -= requirement;
            level += 1;
            requirement = Arquimago.getAttributeRequirement(level);
            guard += 1;
        }
        return {
            level: level,
            progress: remaining,
            required: requirement,
            total: Math.max(0, Math.floor(Number(total) || 0)),
            percent: Math.min(100, Math.round((remaining / requirement) * 100))
        };
    }

    Arquimago.getAttributeProgress = function (state, key) {
        state = state || Arquimago.state;
        if (!state || !validAttribute(key)) return calculateAttribute(0);
        if (!state.attributes) state.attributes = {};
        if (!state.attributes[key]) state.attributes[key] = { total: 0 };
        var data = calculateAttribute(state.attributes[key].total);
        state.attributes[key].level = data.level;
        state.attributes[key].progress = data.progress;
        state.attributes[key].required = data.required;
        state.attributes[key].total = data.total;
        return data;
    };

    Arquimago.getMissionsForAttribute = function (key, state) {
        return Arquimago.getAllMissionEntries(state).filter(function (entry) {
            return entry.mission.attribute === key;
        });
    };

    Arquimago.getMissionCompletionCount = function (state, missionId) {
        return Number(state && state.missionCompletionCounts && state.missionCompletionCounts[missionId]) || 0;
    };

    /* ============================================================
       Progressão de nível baseada em missões (60% das disponíveis)
       ============================================================ */
    Arquimago.getAvailableMissionCount = function (state) {
        return Arquimago.getAllMissionEntries(state).length;
    };

    Arquimago.getTotalAvailableMissionXP = function (state) {
        var entries = Arquimago.getAllMissionEntries(state);
        var total = 0;
        entries.forEach(function (entry) {
            total += Number(entry.mission.xp) || 0;
        });
        return total;
    };

    Arquimago.getMissionLevelRequirement = function (state) {
        var total = Arquimago.getAvailableMissionCount(state);
        return Math.ceil(total * 0.6);
    };

    Arquimago.getMissionXPRequirement = function (state) {
        var totalXP = Arquimago.getTotalAvailableMissionXP(state);
        return Math.ceil(totalXP * 0.6);
    };

    Arquimago.getCompletedAvailableMissions = function (state) {
        var entries = Arquimago.getAllMissionEntries(state);
        var completed = 0;
        entries.forEach(function (entry) {
            if (isDoneInType(state, entry.mission, entry.type)) completed++;
        });
        return completed;
    };

    Arquimago.getMissionLevelProgress = function (state) {
        var required = Arquimago.getMissionLevelRequirement(state);
        var completed = Arquimago.getCompletedAvailableMissions(state);
        var percent = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
        return {
            completed: completed,
            required: required,
            percent: percent,
            isMet: completed >= required && required > 0
        };
    };

    Arquimago.getMissionXPProgress = function (state) {
        var requiredXP = Arquimago.getMissionXPRequirement(state);
        var earnedXP = Number(state.xpCompletedForLevel) || 0;
        var percent = requiredXP > 0 ? Math.min(100, Math.round((earnedXP / requiredXP) * 100)) : 0;
        return {
            earned: earnedXP,
            required: requiredXP,
            percent: percent,
            isMet: earnedXP >= requiredXP && requiredXP > 0
        };
    };

    Arquimago.changeAttributeProgress = function (state, mission, delta) {
        if (!state || !mission || !validAttribute(mission.attribute)) return { levelUp: false, data: null };
        if (!state.attributes) state.attributes = {};
        if (!state.attributes[mission.attribute]) state.attributes[mission.attribute] = { total: 0 };
        var before = Arquimago.getAttributeProgress(state, mission.attribute);
        var entry = state.attributes[mission.attribute];
        entry.total = Math.max(0, (Number(entry.total) || 0) + delta);

        if (!state.missionCompletionCounts) state.missionCompletionCounts = {};
        var count = Number(state.missionCompletionCounts[mission.id]) || 0;
        state.missionCompletionCounts[mission.id] = Math.max(0, count + delta);

        var after = Arquimago.getAttributeProgress(state, mission.attribute);
        return { levelUp: after.level > before.level, data: after };
    };

    function bossDefinitionForWeek(week) {
        var definitions = Arquimago.BOSSES || [];
        if (!definitions.length) return null;
        var hash = 0;
        String(week || "").split("").forEach(function (char) {
            hash = (hash + char.charCodeAt(0)) % 2147483647;
        });
        return definitions[hash % definitions.length];
    }

    Arquimago.createWeeklyBoss = function (week) {
        var definition = bossDefinitionForWeek(week);
        if (!definition) return null;
        return {
            id: definition.id,
            week: week,
            name: definition.name,
            icon: definition.icon,
            image: definition.image || "",
            maxHp: definition.maxHp,
            hp: definition.maxHp,
            description: definition.description,
            weaknesses: definition.weaknesses.slice(),
            reward: definition.reward,
            defeated: false
        };
    };

    Arquimago.ensureWeeklyBoss = function (state, week) {
        state = state || Arquimago.state;
        week = week || weekKey();
        if (!state.weeklyBoss || state.weeklyBoss.week !== week || !Number(state.weeklyBoss.maxHp) || !Array.isArray(state.weeklyBoss.weaknesses)) {
            state.weeklyBoss = Arquimago.createWeeklyBoss(week);
            state.bossDamageEvents = [];
        }
        if (!Array.isArray(state.bossDamageEvents)) state.bossDamageEvents = [];
        return state.weeklyBoss;
    };

    Arquimago.getWeeklyBoss = function (state) {
        return Arquimago.ensureWeeklyBoss(state || Arquimago.state, weekKey());
    };

    Arquimago.getBossDamageForMission = function (mission, boss) {
        if (!mission) return 0;
        var base = Math.max(1, Number(mission.bossDamage) || 10);
        var weak = boss && boss.weaknesses && boss.weaknesses.indexOf(mission.id) !== -1;
        return Math.round(base * (weak ? 1.5 : 1));
    };

    Arquimago.damageWeeklyBoss = function (state, mission) {
        var boss = Arquimago.ensureWeeklyBoss(state, weekKey());
        if (!boss || boss.defeated || !mission) return { damage: 0, boss: boss, defeated: false, weakness: false };

        var key = todayKey() + "|" + mission.id;
        var existing = state.bossDamageEvents.some(function (event) { return event.key === key; });
        if (existing) return { damage: 0, boss: boss, defeated: false, weakness: false };

        var weakness = boss.weaknesses.indexOf(mission.id) !== -1;
        var damage = Arquimago.getBossDamageForMission(mission, boss);
        state.bossDamageEvents.push({ key: key, missionId: mission.id, damage: damage, date: todayKey() });
        boss.hp = Math.max(0, boss.hp - damage);
        var defeated = false;

        if (boss.hp === 0) {
            boss.defeated = true;
            defeated = true;
            if (!Array.isArray(state.bossTrophies)) state.bossTrophies = [];
            var trophyId = boss.id + "_" + boss.week;
            if (!state.bossTrophies.some(function (trophy) { return trophy.id === trophyId; })) {
                state.bossTrophies.push({
                    id: trophyId,
                    bossId: boss.id,
                    name: boss.reward,
                    bossName: boss.name,
                    week: boss.week,
                    earnedAt: todayKey()
                });
            }
        }

        return { damage: damage, boss: boss, defeated: defeated, weakness: weakness };
    };

    Arquimago.applyMissionProgress = function (state, mission) {
        var attribute = Arquimago.changeAttributeProgress(state, mission, 1);
        var boss = Arquimago.damageWeeklyBoss(state, mission);
        var rank = Arquimago.updateDailyRank(state);
        return { attribute: attribute, boss: boss, rank: rank };
    };

    Arquimago.revertMissionProgress = function (state, mission) {
        var result = Arquimago.changeAttributeProgress(state, mission, -1);
        result.rank = Arquimago.updateDailyRank(state);
        return result;
    };

    Arquimago.normalizeState = function (state) {
        state.completedIds = Array.isArray(state.completedIds) ? state.completedIds : [];
        state.dailyDone = Array.isArray(state.dailyDone) ? state.dailyDone : [];
        state.weeklyDone = Array.isArray(state.weeklyDone) ? state.weeklyDone : [];
        state.habitsDone = Array.isArray(state.habitsDone) ? state.habitsDone : [];
        state.customMissions = Array.isArray(state.customMissions) ? state.customMissions : [];
        state.hiddenMissionIds = Array.isArray(state.hiddenMissionIds) ? state.hiddenMissionIds : [];
        state.deletedMissionIds = Array.isArray(state.deletedMissionIds) ? state.deletedMissionIds : [];
        state.achievements = Array.isArray(state.achievements) ? state.achievements : ["recomeco"];
        state.unlockedSpells = Array.isArray(state.unlockedSpells) ? state.unlockedSpells : ["focus"];
        state.bossTrophies = Array.isArray(state.bossTrophies) ? state.bossTrophies : [];
        state.bossDamageEvents = Array.isArray(state.bossDamageEvents) ? state.bossDamageEvents : [];
        state.missionCompletionCounts = state.missionCompletionCounts && typeof state.missionCompletionCounts === "object" ? state.missionCompletionCounts : {};

        var previous = state.attributes && typeof state.attributes === "object" ? state.attributes : {};
        var legacyMap = {
            strength: "discipline",
            intelligence: "wisdom",
            vitality: "consistency",
            spirit: null
        };
        var attributes = {};
        Object.keys(Arquimago.ATTRIBUTE_DEFINITIONS || {}).forEach(function (key) {
            var raw = previous[key];
            var total;
            if (raw && typeof raw === "object") {
                total = Number(raw.total);
                if (!isFinite(total)) total = 0;
            } else if (typeof raw === "number") {
                total = raw;
            } else if (legacyMap[key] && typeof previous[legacyMap[key]] === "number") {
                total = previous[legacyMap[key]];
            } else {
                total = 0;
            }
            attributes[key] = { total: Math.max(0, Math.floor(total)) };
        });
        state.attributes = attributes;
        Object.keys(attributes).forEach(function (key) { Arquimago.getAttributeProgress(state, key); });

        state.customMissions.forEach(function (mission) {
            mission.xp = Math.max(2, Math.min(8, parseInt(mission.xp, 10) || 4));
            mission.bossDamage = Math.max(5, Math.min(35, parseInt(mission.bossDamage, 10) || 10));
            if (!validAttribute(mission.attribute)) mission.attribute = "vitality";
        });

        state.bestDailyRank = validRank(state.bestDailyRank) ? state.bestDailyRank : "D";
        state.bestDailyRankPercent = Math.max(0, Math.min(100, Number(state.bestDailyRankPercent) || 0));
        state.daysUsingApp = Math.max(0, Number(state.daysUsingApp) || 0);
        if (typeof state.lastUsageDate !== "string") state.lastUsageDate = "";
        if (typeof state.level !== "number" || state.level < 1) state.level = 1;
        if (typeof state.xp !== "number" || state.xp < 0) state.xp = 0;
        if (typeof state.totalXP !== "number" || state.totalXP < 0) state.totalXP = 0;
        if (typeof state.missionsCompleted !== "number" || state.missionsCompleted < 0) state.missionsCompleted = 0;
        if (typeof state.missionsCompletedForLevel !== "number" || state.missionsCompletedForLevel < 0) state.missionsCompletedForLevel = 0;
        if (typeof state.xpCompletedForLevel !== "number" || state.xpCompletedForLevel < 0) state.xpCompletedForLevel = 0;
        if (Arquimago.normalizeFinancas) Arquimago.normalizeFinancas(state);
        return state;
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
