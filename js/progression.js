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
        var d = new Date();
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }

    function weekKey() {
        if (Arquimago.getWeekKey) return Arquimago.getWeekKey();
        var d = new Date();
        var day = d.getDay();
        var diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
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

    function allNativeMissions(state) {
        var result = [];
        ["main", "daily", "weekly", "habits"].forEach(function (type) {
            (Arquimago.MISSIONS[type] || []).forEach(function (mission) {
                result.push({
                    mission: Arquimago.applyMissionOverrides ? Arquimago.applyMissionOverrides(mission, state) : mission,
                    type: type
                });
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

    Arquimago.getMissionOverrides = function (state) {
        state = state || Arquimago.state;
        return (state && state.missionOverrides && typeof state.missionOverrides === "object") ? state.missionOverrides : {};
    };

    Arquimago.clampMissionXp = function (xp) {
        return Math.max(1, Math.min(10, parseInt(xp, 10) || 4));
    };

    Arquimago.applyMissionOverrides = function (mission, state) {
        if (!mission) return mission;
        var overrides = Arquimago.getMissionOverrides(state);
        var ov = overrides[mission.id];
        if (!ov) return mission;
        var merged = {};
        var key;
        for (key in mission) {
            if (Object.prototype.hasOwnProperty.call(mission, key)) merged[key] = mission[key];
        }
        if (ov.xp !== undefined && ov.xp !== null && isFinite(ov.xp)) {
            merged.xp = Arquimago.clampMissionXp(ov.xp);
        }
        if (ov.icon) merged.icon = String(ov.icon);
        return merged;
    };

    Arquimago.saveMissionOverride = function (missionId, patch) {
        var state = Arquimago.state;
        if (!state || !missionId) return;
        if (!state.missionOverrides || typeof state.missionOverrides !== "object") state.missionOverrides = {};
        var ov = state.missionOverrides[missionId] || {};
        if (patch && patch.xp !== undefined && patch.xp !== null) {
            ov.xp = Arquimago.clampMissionXp(patch.xp);
        }
        if (patch && patch.icon) ov.icon = String(patch.icon);
        state.missionOverrides[missionId] = ov;
        Arquimago.saveState(state);
    };

    Arquimago.clearMissionOverride = function (missionId) {
        var state = Arquimago.state;
        if (!state || !missionId) return;
        if (state.missionOverrides && typeof state.missionOverrides === "object") {
            delete state.missionOverrides[missionId];
        }
        Arquimago.saveState(state);
    };

    Arquimago.getAllMissionEntries = function (state, includeSuppressed) {
        state = state || Arquimago.state;
        var entries = allNativeMissions(state);
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
        return Arquimago.getAllMissionEntries(state);
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

    function monthKeyFromValue(value) {
        if (value && /^\d{4}-\d{2}$/.test(String(value))) return String(value);
        if (Arquimago.getMonthKey) return Arquimago.getMonthKey();
        var now = new Date();
        return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
    }

    function nextMonthKey(key) {
        var parts = String(key).split("-");
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        if (!isFinite(year) || !isFinite(month)) return null;
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
        return year + "-" + String(month).padStart(2, "0");
    }

    function monthSerial(key) {
        var parts = String(key).split("-");
        var year = parseInt(parts[0], 10);
        var month = parseInt(parts[1], 10);
        return isFinite(year) && isFinite(month) ? year * 12 + month : NaN;
    }

    Arquimago.getMonthlyAvailableMissionXP = function (state, month) {
        state = state || Arquimago.state;
        month = monthKeyFromValue(month);
        var missionXP = Arquimago.getTotalAvailableMissionXP(state);
        var workdays = Arquimago.getBusinessDaysInMonth ? Arquimago.getBusinessDaysInMonth(month) : 0;
        return missionXP * workdays;
    };

    Arquimago.getMonthlyGoalXP = function (availableXP) {
        return Math.ceil(Math.max(0, Number(availableXP) || 0) * (Arquimago.MONTHLY_GOAL_FRACTION || 0.6));
    };

    Arquimago.getMonthlyProgress = function (state) {
        state = state || Arquimago.state;
        var currentAvailable = Arquimago.getMonthlyAvailableMissionXP(state, state && state.monthlyKey);
        var available = Math.max(0, Number(state && state.monthlyAvailableXP) || 0);
        if (currentAvailable > available) {
            state.monthlyAvailableXP = currentAvailable;
            state.monthlyGoalXP = Arquimago.getMonthlyGoalXP(currentAvailable);
            available = currentAvailable;
        }
        var goal = Math.max(0, Number(state && state.monthlyGoalXP) || Arquimago.getMonthlyGoalXP(available));
        var earned = Math.max(0, Number(state && state.monthlyXP) || 0);
        var percent = available > 0 ? Math.min(100, Math.round((earned / available) * 100)) : 0;
        return {
            month: monthKeyFromValue(state && state.monthlyKey),
            earned: earned,
            available: available,
            goal: goal,
            percent: percent,
            goalPercent: goal > 0 ? Math.min(100, Math.round((earned / goal) * 100)) : 0,
            isMet: goal > 0 && earned >= goal
        };
    };

    function classChangeForCycle(state, met, month) {
        var beforeIndex = Arquimago.getClassIndex(state);
        var direction = met ? 1 : -1;
        var afterIndex = Math.max(0, Math.min(Arquimago.CLASS_DEFINITIONS.length - 1, beforeIndex + direction));
        if (afterIndex === beforeIndex) return null;

        var before = Arquimago.getClassDefinition(state);
        state.classIndex = afterIndex;
        var after = Arquimago.getClassDefinition(state);
        if (!Array.isArray(state.pendingClassChanges)) state.pendingClassChanges = [];
        state.pendingClassChanges.push({
            month: month,
            direction: direction,
            previousClass: before.name,
            currentClass: after.name
        });
        return { direction: direction, previousClass: before.name, currentClass: after.name, month: month };
    }

    Arquimago.finalizeMonthlyCycle = function (state, month) {
        state = state || Arquimago.state;
        month = monthKeyFromValue(month);
        if (!state || !month) return null;
        if ((state.monthlyHistory || []).some(function (entry) { return entry.month === month; })) return null;

        var available = Math.max(0, Number(state.monthlyAvailableXP) || 0);
        if (!available) available = Arquimago.getMonthlyAvailableMissionXP(state, month);
        var earned = Math.max(0, Number(state.monthlyXP) || 0);
        var goal = Arquimago.getMonthlyGoalXP(available);
        var percent = available > 0 ? Math.min(100, Math.round((earned / available) * 100)) : 0;
        var met = goal > 0 && earned >= goal;
        var classBefore = Arquimago.getCharacterClass(state);
        var classIndexBefore = Arquimago.getClassIndex(state);
        var classChange = classChangeForCycle(state, met, month);

        state.monthlyHistory.push({
            month: month,
            xp: earned,
            totalAvailableXP: available,
            goalXP: goal,
            percentage: percent,
            goalMet: met,
            class: classBefore,
            classIndex: classIndexBefore,
            closedAt: todayKey()
        });
        return state.monthlyHistory[state.monthlyHistory.length - 1];
    };

    Arquimago.startMonthlyCycle = function (state, month) {
        state = state || Arquimago.state;
        month = monthKeyFromValue(month);
        state.monthlyKey = month;
        state.monthlyXP = 0;
        state.monthlyAvailableXP = Arquimago.getMonthlyAvailableMissionXP(state, month);
        state.monthlyGoalXP = Arquimago.getMonthlyGoalXP(state.monthlyAvailableXP);
        return Arquimago.getMonthlyProgress(state);
    };

    Arquimago.syncMonthlyCycle = function (state, month) {
        state = state || Arquimago.state;
        month = monthKeyFromValue(month);
        if (!state.monthlyKey || !/^\d{4}-\d{2}$/.test(state.monthlyKey)) {
            Arquimago.startMonthlyCycle(state, month);
            return { changed: true, changes: [] };
        }
        if (state.monthlyKey === month) {
            if (!state.monthlyAvailableXP) {
                state.monthlyAvailableXP = Arquimago.getMonthlyAvailableMissionXP(state, month);
                state.monthlyGoalXP = Arquimago.getMonthlyGoalXP(state.monthlyAvailableXP);
            }
            return { changed: false, changes: [] };
        }
        if (monthSerial(state.monthlyKey) > monthSerial(month)) {
            Arquimago.startMonthlyCycle(state, month);
            return { changed: true, changes: [] };
        }

        var changes = [];
        var cursor = state.monthlyKey;
        var guard = 0;
        while (cursor && cursor !== month && guard < 240) {
            var record = Arquimago.finalizeMonthlyCycle(state, cursor);
            if (record) {
                var change = state.pendingClassChanges[state.pendingClassChanges.length - 1];
                if (change && change.month === cursor) changes.push(change);
            }
            cursor = nextMonthKey(cursor);
            Arquimago.startMonthlyCycle(state, cursor);
            guard++;
        }
        return { changed: true, changes: changes };
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
        state.dailyCompletedMissionIds = Array.isArray(state.dailyCompletedMissionIds) ? state.dailyCompletedMissionIds : [];
        state.dailyHistory = Array.isArray(state.dailyHistory) ? state.dailyHistory : [];
        state.monthlyHistory = Array.isArray(state.monthlyHistory) ? state.monthlyHistory : [];
        state.pendingClassChanges = Array.isArray(state.pendingClassChanges) ? state.pendingClassChanges : [];
        state.customMissions = Array.isArray(state.customMissions) ? state.customMissions : [];
        state.hiddenMissionIds = Array.isArray(state.hiddenMissionIds) ? state.hiddenMissionIds : [];
        state.deletedMissionIds = Array.isArray(state.deletedMissionIds) ? state.deletedMissionIds : [];
        state.missionOverrides = state.missionOverrides && typeof state.missionOverrides === "object" ? state.missionOverrides : {};
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
        if (typeof state.dailyDate !== "string") state.dailyDate = "";
        state.dailyXP = Math.max(0, Number(state.dailyXP) || 0);
        state.dailyAvailableXP = Math.max(0, Number(state.dailyAvailableXP) || 0);
        if (typeof state.monthlyKey !== "string") state.monthlyKey = "";
        state.monthlyXP = Math.max(0, Number(state.monthlyXP) || 0);
        state.monthlyAvailableXP = Math.max(0, Number(state.monthlyAvailableXP) || 0);
        state.monthlyGoalXP = Math.max(0, Number(state.monthlyGoalXP) || 0);
        state.classIndex = Arquimago.getClassIndex(state);
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
