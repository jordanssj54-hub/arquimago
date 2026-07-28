(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    Arquimago.STORAGE_KEY = "arquimago_recomeco_v3";

    Arquimago.DEFAULT_STATE = {
        name: "Arquimago Jordan",
        title: "Aprendiz do Recomeço",
        level: 1,
        xp: 0,
        totalXP: 0,
        streak: 0,
        theme: "current",
        lastActiveDate: "",
        chapter: 1,
        completedIds: [],
        missionsCompleted: 0,
        playTimeSeconds: 0,
        introSeen: false,
        soundEnabled: true,
        dailyDate: "",
        weeklyDate: "",
        dailyDone: [],
        weeklyDone: [],
        habitsDone: [],
        unlockedSpells: ["focus"],
        achievements: ["recomeco"],
        attributes: {
            discipline: 5,
            wisdom: 3,
            determination: 4,
            consistency: 2
        }
    };

    Arquimago.CHAPTERS = [
        { id: 1, name: "O Despertar", minLevel: 1, desc: "Das cinzas ao primeiro passo — encontrar forças para recomeçar." },
        { id: 2, name: "A Floresta dos Ecos", minLevel: 3, desc: "Onde o passado nunca morre — confrontar os ecos do abandono." },
        { id: 3, name: "Ruínas de Asterion", minLevel: 6, desc: "O conhecimento tem seu preço — buscar a sabedoria perdida." },
        { id: 4, name: "Montanhas Cinzentas", minLevel: 10, desc: "O fogo que forja — temperar a determinação nas adversidades." },
        { id: 5, name: "Castelo do Eclipse", minLevel: 15, desc: "O fim do recomeço — enfrentar o Vazio e redefinir o destino." }
    ];

    Arquimago.TITLES = [
        { level: 1, title: "Aprendiz do Recomeço" },
        { level: 3, title: "Andarilho dos Ecos" },
        { level: 6, title: "Buscador de Asterion" },
        { level: 10, title: "Forjado nas Montanhas" },
        { level: 15, title: "Rompedor do Eclipse" },
        { level: 20, title: "Arquimago Supremo" }
    ];

    Arquimago.SPELLS = [
        { id: "focus", name: "Foco Arcano", desc: "Concentração absoluta por 25 minutos.", level: 1, icon: "focus" },
        { id: "discipline", name: "Escudo da Disciplina", desc: "Resistir tentações por um dia.", level: 3, icon: "shield" },
        { id: "wisdom", name: "Clarividência", desc: "Absorver conhecimento profundo.", level: 5, icon: "eye" },
        { id: "vitality", name: "Vitalidade", desc: "Restaurar energia corporal.", level: 7, icon: "heart" },
        { id: "time", name: "Dilatação Temporal", desc: "Maximizar cada hora do dia.", level: 10, icon: "time" },
        { id: "ascension", name: "Ascensão", desc: "Transcender limites pessoais.", level: 15, icon: "star" },
        { id: "archmage", name: "Poder do Arquimago", desc: "Domínio total sobre si mesmo.", level: 20, icon: "crown" }
    ];

    Arquimago.ACHIEVEMENTS = [
        { id: "recomeco", name: "O Recomeço", desc: "Sua jornada recomeçou.", condition: function () { return true; } },
        { id: "week", name: "Primeira Semana", desc: "Complete 7 dias consecutivos.", condition: function (s) { return s.streak >= 7; } },
        { id: "discipline", name: "Disciplina de Ferro", desc: "Complete 30 dias consecutivos.", condition: function (s) { return s.streak >= 30; } },
        { id: "missions10", name: "Caçador de Missões", desc: "Conclua 10 missões.", condition: function (s) { return s.missionsCompleted >= 10; } },
        { id: "level10", name: "Autodomínio", desc: "Alcance o nível 10.", condition: function (s) { return s.level >= 10; } },
        { id: "archmage", name: "Arquimago Supremo", desc: "Conclua todos os capítulos.", condition: function (s) { return s.level >= 20; } }
    ];

    Arquimago.EVENT = {
        name: "Noites do Recomeço",
        desc: "Toda missão concluída concede experiência adicional.",
        bonus: 0.2
    };

    Arquimago.THEMES = {
        current: { name: "Tema Atual", accent: "#c9a84c" },
        light: { name: "Tema Claro", accent: "#7b5a2f" },
        dark: { name: "Tema Escuro", accent: "#d8b970" },
        fantasy: { name: "Tema Fantasia", accent: "#5f8bff" }
    };

    Arquimago.MISSIONS = {
        main: [
            { id: "main_treino", name: "Treino", desc: "Uma sessão de treino completa para fortalecer o corpo.", objective: "Realizar uma sessão completa de exercícios", category: "Corpo", xp: 50, attribute: "discipline" },
            { id: "main_caminhada", name: "Caminhada", desc: "Uma caminhada longa para clarear a mente e o corpo.", objective: "Fazer uma caminhada longa ao ar livre", category: "Corpo", xp: 40, attribute: "discipline" },
            { id: "main_alongamento", name: "Alongamento", desc: "Movimentos suaves para liberar tensões e preparar o espírito.", objective: "Praticar movimentos de alongamento", category: "Corpo", xp: 35, attribute: "discipline" },
            { id: "main_agua", name: "Água", desc: "Hidrate-se com consistência ao longo do dia.", objective: "Manter-se hidratado durante o dia", category: "Corpo", xp: 25, attribute: "discipline" },
            { id: "main_alimentacao", name: "Alimentação", desc: "Escolha uma refeição equilibrada e consciente.", objective: "Escolher uma refeição equilibrada", category: "Corpo", xp: 30, attribute: "consistency" },
            { id: "main_sono", name: "Sono", desc: "Descanse em hora adequada para recuperar força.", objective: "Dormir em horário adequado", category: "Corpo", xp: 35, attribute: "consistency" }
        ],
        daily: [
            { id: "daily_meditacao", name: "Meditação", desc: "10 minutos de silêncio para acalmar a mente.", objective: "Dedicar 10 minutos ao silêncio", category: "Mente", xp: 25, attribute: "wisdom" },
            { id: "daily_leitura", name: "Leitura", desc: "Leia por 20 minutos e amplie sua visão.", objective: "Ler por 20 minutos", category: "Mente", xp: 30, attribute: "wisdom" },
            { id: "daily_estudo", name: "Estudo", desc: "Dedique um tempo a aprender algo novo.", objective: "Aprender algo novo hoje", category: "Mente", xp: 35, attribute: "wisdom" },
            { id: "daily_diario", name: "Diário", desc: "Escreva um registro breve sobre o seu dia.", objective: "Escrever um registro do dia", category: "Mente", xp: 20, attribute: "wisdom" },
            { id: "daily_gratidao", name: "Gratidão", desc: "Anote 3 razões para agradecer.", objective: "Anotar 3 razões para agradecer", category: "Mente", xp: 20, attribute: "wisdom" }
        ],
        weekly: [
            { id: "weekly_planejamento", name: "Planejamento", desc: "Organize seus objetivos da semana com clareza.", objective: "Organizar objetivos da semana", category: "Produtividade", xp: 80, attribute: "determination" },
            { id: "weekly_trabalho", name: "Trabalho", desc: "Conclua uma etapa importante de seu projeto.", objective: "Concluir uma etapa importante", category: "Produtividade", xp: 90, attribute: "determination" },
            { id: "weekly_projeto", name: "Projeto Arquimago", desc: "Acelere um avanço concreto no projeto da jornada.", objective: "Acelerar avanço no projeto", category: "Produtividade", xp: 100, attribute: "determination" },
            { id: "weekly_organizacao", name: "Organização", desc: "Revise e organize seu espaço e suas prioridades.", objective: "Revisar e organizar espaço", category: "Produtividade", xp: 70, attribute: "discipline" },
            { id: "weekly_revisao", name: "Revisão", desc: "Reveja seu progresso e ajuste sua direção.", objective: "Rever progresso e ajustar direção", category: "Produtividade", xp: 75, attribute: "wisdom" }
        ],
        habits: [
            { id: "habit_limpeza", name: "Limpeza", desc: "Mantenha seu ambiente mais sereno e ordenado.", objective: "Manter ambiente sereno e ordenado", category: "Vida", xp: 35, attribute: "consistency" },
            { id: "habit_familia", name: "Família", desc: "Reserve um tempo para quem é importante.", objective: "Reservar tempo para entes queridos", category: "Vida", xp: 40, attribute: "consistency" },
            { id: "habit_lazer", name: "Lazer saudável", desc: "Descanse com algo leve e prazeroso.", objective: "Descansar com algo leve e prazeroso", category: "Vida", xp: 35, attribute: "determination" },
            { id: "habit_descanso", name: "Descanso", desc: "Pare por um tempo e recupere sua energia.", objective: "Parar e recuperar energia", category: "Vida", xp: 40, attribute: "consistency" }
        ]
    };

    Arquimago.xpRequiredForLevel = function (level) {
        return Math.floor(100 * Math.pow(1.25, Math.max(0, level - 1)));
    };

    Arquimago.getTitleForLevel = function (level) {
        var title = Arquimago.TITLES[0].title;
        Arquimago.TITLES.forEach(function (t) {
            if (level >= t.level) title = t.title;
        });
        return title;
    };

    Arquimago.getChapterForLevel = function (level) {
        var chapter = Arquimago.CHAPTERS[0];
        Arquimago.CHAPTERS.forEach(function (c) {
            if (level >= c.minLevel) chapter = c;
        });
        return chapter;
    };

    Arquimago.getEventBonus = function () {
        return Arquimago.EVENT.bonus;
    };

    Arquimago.formatNumber = function (n) {
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    Arquimago.isMissionCompleted = function (state, missionId) {
        if (state.completedIds.indexOf(missionId) !== -1) return true;
        if (state.dailyDone.indexOf(missionId) !== -1) return true;
        if (state.weeklyDone.indexOf(missionId) !== -1) return true;
        if (state.habitsDone.indexOf(missionId) !== -1) return true;
        return false;
    };

    Arquimago.getMageImage = function () {
        var src = "assets/illustrations/bfa5928a-10a0-4051-82cc-afc7765cc438.png";
        if (Arquimago.state && Arquimago.state.customAvatar) {
            src = Arquimago.state.customAvatar;
        }
        return '<img src="' + src + '" alt="Arquimago" class="mage-avatar-img">';
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
