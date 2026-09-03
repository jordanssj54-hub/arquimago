(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    Arquimago.STORAGE_KEY = "arquimago_recomeco_v3";
    Arquimago.MONTHLY_GOAL_FRACTION = 0.6;

    Arquimago.NAVIGATION = {
        position: "left",
        scale: 1.0
    };

    Arquimago.ATTRIBUTE_DEFINITIONS = {
        strength: {
            name: "Força",
            icon: "💪",
            color: "#e88b5c",
            description: "O corpo que se move, resiste e ganha presença.",
            missionIds: ["main_treino", "main_caminhada", "main_alongamento"]
        },
        intelligence: {
            name: "Inteligência",
            icon: "🧠",
            color: "#7ca9e8",
            description: "A mente que aprende, investiga e transforma curiosidade em domínio.",
            missionIds: ["daily_leitura", "daily_estudo", "daily_diario", "weekly_planejamento", "weekly_trabalho", "weekly_projeto", "weekly_organizacao", "weekly_revisao"]
        },
        vitality: {
            name: "Vitalidade",
            icon: "❤️",
            color: "#e47783",
            description: "A energia protegida por cuidado, descanso e escolhas conscientes.",
            missionIds: ["main_agua", "main_alimentacao", "main_sono", "habit_descanso"]
        },
        spirit: {
            name: "Espírito",
            icon: "🧘",
            color: "#b795e8",
            description: "A presença que encontra calma, gratidão e sentido no caminho.",
            missionIds: ["daily_meditacao", "daily_gratidao", "habit_limpeza", "habit_familia", "habit_lazer"]
        }
    };

    Arquimago.BOSSES = [
        {
            id: "preguica",
            name: "Preguiça",
            icon: "👹",
            image: "assets/boss/preguiça.png",
            maxHp: 300,
            description: "Uma sombra pesada que sussurra para deixar o próximo passo para depois.",
            weaknesses: ["main_treino", "weekly_planejamento", "main_sono"],
            reward: "Troféu da Vontade Desperta"
        },
        {
            id: "procrastinacao",
            name: "Procrastinação",
            icon: "🕷️",
            image: "assets/boss/procrastinação.png",
            maxHp: 300,
            description: "Tece desculpas entre você e aquilo que realmente importa.",
            weaknesses: ["daily_estudo", "daily_leitura", "weekly_projeto"],
            reward: "Troféu do Primeiro Passo"
        },
        {
            id: "ansiedade",
            name: "Ansiedade",
            icon: "🌪️",
            maxHp: 300,
            description: "Uma tempestade interna que tenta roubar o espaço do presente.",
            weaknesses: ["daily_meditacao", "daily_gratidao", "main_sono"],
            reward: "Troféu da Mente Serena"
        },
        {
            id: "sedentarismo",
            name: "Sedentarismo",
            icon: "🗿",
            image: "assets/boss/sedenterismo.png",
            maxHp: 300,
            description: "Pedra antiga que torna cada movimento mais difícil do que deveria ser.",
            weaknesses: ["main_treino", "main_caminhada", "main_alongamento"],
            reward: "Troféu do Corpo Desperto"
        },
        {
            id: "desorganizacao",
            name: "Desorganização",
            icon: "🌀",
            image: "assets/boss/desorganização.png",
            maxHp: 300,
            description: "Mistura caminhos, acumula ruídos e esconde o que merece sua atenção.",
            weaknesses: ["weekly_organizacao", "weekly_planejamento", "daily_diario"],
            reward: "Troféu da Clareza"
        },
        {
            id: "estresse",
            name: "Estresse",
            icon: "🔥",
            image: "assets/boss/estresse.png",
            maxHp: 300,
            description: "Uma chama que consome a paz de pequenos gestos ao longo do dia.",
            weaknesses: ["daily_meditacao", "daily_leitura", "habit_lazer"],
            reward: "Troféu da Calma Restaurada"
        }
    ];

    Arquimago.DEFAULT_STATE = {
        name: "",
        title: "Aprendiz do Recomeço",
        level: 1,
        xp: 0,
        totalXP: 0,
        classIndex: 0,
        streak: 0,
        template: "default",
        theme: "current",
        font: "classica",
        wallpaper: "auto",
        customWallpaper: "",
        aboutMe: "",
        lastActiveDate: "",
        chapter: 1,
        completedIds: [],
        missionsCompleted: 0,
        missionsCompletedForLevel: 0,
        xpCompletedForLevel: 0,
        playTimeSeconds: 0,
        introSeen: false,
        soundEnabled: true,
        navPosition: "left",
        navCollapsed: false,
        navScale: 1,
        dailyDate: "",
        dailyXP: 0,
        dailyAvailableXP: 0,
        dailyCompletedMissionIds: [],
        dailyHistory: [],
        weeklyDate: "",
        dailyDone: [],
        weeklyDone: [],
        habitsDone: [],
        customMissions: [],
        hiddenMissionIds: [],
        deletedMissionIds: [],
        missionOverrides: {},
        unlockedSpells: ["focus"],
        achievements: ["recomeco"],
        grimoireData: [],
        grimoireFavs: {},
        attributes: {
            strength: { level: 1, progress: 0, total: 0 },
            intelligence: { level: 1, progress: 0, total: 0 },
            vitality: { level: 1, progress: 0, total: 0 },
            spirit: { level: 1, progress: 0, total: 0 }
        },
        missionCompletionCounts: {},
        weeklyBoss: null,
        bossDamageEvents: [],
        bossTrophies: [],
        bestDailyRank: "D",
        bestDailyRankPercent: 0,
        daysUsingApp: 0,
        lastUsageDate: "",
        monthlyKey: "",
        monthlyXP: 0,
        monthlyAvailableXP: 0,
        monthlyGoalXP: 0,
        monthlyHistory: [],
        pendingClassChanges: [],
        financas: {
            saldo: 0,
            guardado: 0,
            saldoInicial: 0,
            guardadoInicial: 0,
            despesas: [],
            transacoes: []
        }
    };

    Arquimago.CHAPTERS = [
        { id: 1, name: "Floresta Arcana", minLevel: 1, desc: "Uma floresta antiga onde árvores milenares guardam segredos esquecidos." },
        { id: 2, name: "Ruínas Antigas", minLevel: 2, desc: "Pilares quebrados e inscrições antigas contam a história de um poder perdido." },
        { id: 3, name: "Entrada da Masmorra", minLevel: 3, desc: "A escuridão aguarda. Algo ancestral pulsa nas profundezas." }
    ];

    Arquimago.CHAPTER_FLOW = {
        1: { next: 2, room: "floresta_arcana", title: "Floresta Arcana" },
        2: { next: 3, room: "ruinas_antigas", title: "Ruínas Antigas" },
        3: { next: null, room: "entrada_masmorra", title: "Entrada da Masmorra" }
    };

    Arquimago.TITLES = [
        { level: 1, title: "Aprendiz do Recomeço" },
        { level: 3, title: "Andarilho dos Ecos" },
        { level: 6, title: "Buscador de Asterion" },
        { level: 10, title: "Forjado nas Montanhas" },
        { level: 15, title: "Rompedor do Eclipse" },
        { level: 20, title: "Arquimago Supremo" }
    ];

    Arquimago.CLASS_DEFINITIONS = [
        { id: "D", name: "D" },
        { id: "C", name: "C" },
        { id: "B", name: "B" },
        { id: "A", name: "A" },
        { id: "S", name: "S" }
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
        { id: "boss1", name: "Primeira Caçada", desc: "Derrote seu primeiro Boss da Semana.", condition: function (s) { return (s.bossTrophies || []).length >= 1; } },
        { id: "archmage", name: "Arquimago Supremo", desc: "Conclua todos os capítulos.", condition: function (s) { return s.level >= 20; } }
    ];

    Arquimago.GRIMOIRE_TYPES = [
        { id: "imagem", label: "Imagem", icon: "🖼️", color: "#a78bfa" },
        { id: "foto", label: "Fotografia", icon: "📷", color: "#60a5fa" },
        { id: "texto", label: "Texto", icon: "📝", color: "#e2c184" },
        { id: "poesia", label: "Poesia", icon: "📜", color: "#f5c65c" },
        { id: "carta", label: "Carta", icon: "💌", color: "#f472b6" },
        { id: "musica", label: "Música", icon: "🎵", color: "#34d399" },
        { id: "audio", label: "Áudio", icon: "🎧", color: "#22d3ee" },
        { id: "video", label: "Vídeo", icon: "🎬", color: "#fb7185" },
        { id: "link", label: "Link", icon: "🔗", color: "#818cf8" },
        { id: "curiosidade", label: "Curiosidade", icon: "🔍", color: "#fbbf24" },
        { id: "colecionavel", label: "Colecionável", icon: "🏺", color: "#c084fc" },
        { id: "medalha", label: "Medalha", icon: "🎖️", color: "#f59e0b" },
        { id: "trofeu", label: "Troféu", icon: "🏆", color: "#facc15" },
        { id: "premio", label: "Prêmio", icon: "🎁", color: "#fb923c" }
    ];

    Arquimago.getGrimoireType = function (id) {
        var t = Arquimago.GRIMOIRE_TYPES.find(function (g) { return g.id === id; });
        return t || { id: "premio", label: "Prêmio", icon: "🎁", color: "#fb923c" };
    };

    Arquimago.GRIMOIRE_ICONS = [
        "🎁", "🏆", "🎖️", "🥇", "🥈", "🥉", "👑", "💎", "🏺", "🗿", "🪙", "💰",
        "🍟", "🍕", "🍰", "🍪", "🍫", "🍭", "☕", "🧋", "🥤", "🍹", "🍿", "🍩",
        "📜", "📖", "📚", "✉️", "💌", "📝", "🖋️", "📷", "🖼️", "🎨", "🎬", "🎵",
        "🎧", "🎤", "🎸", "🎹", "📻", "📱", "💻", "🔗", "🔍", "🔭", "🌌", "⭐",
        "🌟", "✨", "🌙", "☀️", "🌸", "🌹", "🌻", "🍀", "🦋", "🕊️", "🐺", "🔥",
        "💖", "💫", "🧸", "🪄", "⚗️", "🧿", "🕯️", "🗝️", "🗺️", "🧭", "⌛", "⏳"
    ];

    Arquimago.GRIMOIRE_REWARDS = [
        { id: "recompensa_batata", nome: "Batata Sensações", descricao: "O primeiro passo merece celebração: um pacote de batata para comemorar o recomeço.", categoria: "Comida", nivelNecessario: 1, icone: "🍟", tipo: "premio" },
        { id: "recompensa_poesia", nome: "Poesia", descricao: "Uma poesia declamada só para você, com calma, ao entardecer.", categoria: "Arte", nivelNecessario: 2, icone: "📜", tipo: "poesia" },
        { id: "recompensa_musica", nome: "Música", descricao: "Uma música para ouvir de olhos fechados e sentir.", categoria: "Música", nivelNecessario: 3, icone: "🎵", tipo: "musica" },
        { id: "recompensa_fotografia", nome: "Fotografia", descricao: "Uma fotografia especial para guardar esse momento.", categoria: "Arte", nivelNecessario: 4, icone: "📸", tipo: "foto" },
        { id: "recompensa_video", nome: "Vídeo", descricao: "Um vídeo escolhido para te emocionar.", categoria: "Lazer", nivelNecessario: 5, icone: "🎬", tipo: "video" },
        { id: "recompensa_mensagem", nome: "Mensagem", descricao: "Uma mensagem escrita do fundo do coração, só para você.", categoria: "Surpresa", nivelNecessario: 6, icone: "💬", tipo: "texto" },
        { id: "recompensa_presente", nome: "Presente", descricao: "O grande prêmio do recomeço. Uma surpresa especial.", categoria: "Surpresa", nivelNecessario: 7, icone: "🎁", tipo: "premio" }
    ];

    Arquimago.EVENT = {
        name: "Noites do Recomeço",
        desc: "Pequenos passos constroem uma jornada duradoura.",
        bonus: 0
    };

    Arquimago.THEMES = {
        current: { name: "Tema Atual", accent: "#c9a84c" },
        light: { name: "Tema Claro", accent: "#7b5a2f" },
        dark: { name: "Tema Escuro", accent: "#d8b970" },
        fantasy: { name: "Tema Fantasia", accent: "#5f8bff" },
        rosa: { name: "Tema Rosa", accent: "#f2a0c0" },
        cyberpunk: { name: "Cyberpunk Neon", accent: "#22d3ee" },
        arcane: { name: "Arcane Esmeralda", accent: "#34d399" },
        shadow: { name: "Shadow Elétrico", accent: "#3b82f6" },
        crimson: { name: "Tema Crimson", accent: "#e50914" },
        emerald: { name: "Tema Emerald", accent: "#2dd47f" },
        mystic: { name: "Tema Mystic Purple", accent: "#a78bfa" },
        abyss: { name: "Tema Dark Abyss", accent: "#5b7c99" },
        "arcane-ancient": { name: "Ancient Ember", accent: "#d97706" },
        "arcane-forest": { name: "Forest Glow", accent: "#4ade80" },
        "arcane-royal": { name: "Royal Gold", accent: "#f5c65c" },
        "arcane-alchemist": { name: "Alchemist Copper", accent: "#c07a4a" },
        "arcane-celestial": { name: "Celestial Starlight", accent: "#a5b4fc" },
        "arcane-crystal": { name: "Crystal Teal", accent: "#2dd4bf" },
        "arcane-druid": { name: "Druid Moss", accent: "#84cc16" },
        "arcane-library": { name: "Library Candle", accent: "#e2c184" },
        "arcane-sanctuary": { name: "Sanctuary Light", accent: "#e0e7ff" },
        "template-2": { name: "Template 2 · Magia Arcano", accent: "#b9a7ff" }
    };

    Arquimago.TEMPLATES = {
        default: { id: "default", name: "Padrão", officialTheme: "current", desc: "Visual original do Arquimago." },
        cyberpunk: { id: "cyberpunk", name: "Cyberpunk", officialTheme: "cyberpunk", desc: "Cidade neon, HUD futurista e chuva." },
        arcane: { id: "arcane", name: "Arcane Magic", officialTheme: "arcane", desc: "Grimório mágico, runas e pergaminhos." },
        shadow: { id: "shadow", name: "Shadow System", officialTheme: "shadow", desc: "Interface de evolução de RPG." },
        "arcane-ancient": { id: "arcane-ancient", name: "Arcane Ancient", officialTheme: "arcane-ancient", desc: "Ruínas antigas, grimórios esquecidos, runas e magia ancestral." },
        "arcane-forest": { id: "arcane-forest", name: "Arcane Forest", officialTheme: "arcane-forest", desc: "Florestas mágicas, espíritos da natureza e brilho verde." },
        "arcane-royal": { id: "arcane-royal", name: "Arcane Royal", officialTheme: "arcane-royal", desc: "Magia nobre, dourado, castelos, brasões e luxo." },
        "arcane-alchemist": { id: "arcane-alchemist", name: "Arcane Alchemist", officialTheme: "arcane-alchemist", desc: "Frascos, alquimia, cobre, bronze e laboratórios mágicos." },
        "arcane-celestial": { id: "arcane-celestial", name: "Arcane Celestial", officialTheme: "arcane-celestial", desc: "Constelações, estrelas, céu noturno e magia astral." },
        "arcane-crystal": { id: "arcane-crystal", name: "Arcane Crystal", officialTheme: "arcane-crystal", desc: "Cristais mágicos, energia e brilho azul-esverdeado." },
        "arcane-druid": { id: "arcane-druid", name: "Arcane Druid", officialTheme: "arcane-druid", desc: "Natureza, madeira, raízes, pedras e magia elemental." },
        "arcane-library": { id: "arcane-library", name: "Arcane Library", officialTheme: "arcane-library", desc: "Biblioteca mágica, pergaminhos, livros, velas e mapas." },
        "arcane-sanctuary": { id: "arcane-sanctuary", name: "Arcane Sanctuary", officialTheme: "arcane-sanctuary", desc: "Templos antigos, mármore, colunas e símbolos sagrados." },
        "template-2": { id: "template-2", name: "Template 2", officialTheme: "template-2", desc: "Magia Arcano — visual extraído de reference-ui-template-2." }
    };

    Arquimago.TYPOGRAPHY = {
        classica: { id: "classica", name: "Clássica", display: '"Cinzel", serif', body: '"Inter", sans-serif' },
        pixel: { id: "pixel", name: "Pixel", display: '"Pixelify Sans", monospace', body: '"Pixelify Sans", sans-serif' },
        ninja: { id: "ninja", name: "Ninja", display: '"Yuji Syuku", "Klee One", serif', body: '"Klee One", sans-serif' },
        arcane: { id: "arcane", name: "Arcane", display: '"IM Fell English", "Cormorant", serif', body: '"Cormorant", serif' },
        shadow: { id: "shadow", name: "Shadow", display: '"Chakra Petch", "Rajdhani", sans-serif', body: '"Chakra Petch", sans-serif' },
        cyber: { id: "cyber", name: "Cyber", display: '"Orbitron", sans-serif', body: '"Exo 2", sans-serif' },
        medieval: { id: "medieval", name: "Medieval", display: '"Cinzel Decorative", "Cinzel", serif', body: '"EB Garamond", serif' },
        rune: { id: "rune", name: "Rune", display: '"MedievalSharp", "Cormorant", cursive', body: '"Cormorant", serif' },
        fantasy: { id: "fantasy", name: "Fantasy", display: '"Cinzel", serif', body: '"Alegreya", serif' },
        mystic: { id: "mystic", name: "Mystic", display: '"IM Fell English SC", "IM Fell English", serif', body: '"EB Garamond", serif' },
        ancient: { id: "ancient", name: "Ancient", display: '"Cinzel", serif', body: '"Old Standard TT", serif' },
        gothic: { id: "gothic", name: "Gothic", display: '"UnifrakturMaguntia", "Cinzel Decorative", cursive', body: '"Cormorant Garamond", serif' },
        elegant: { id: "elegant", name: "Elegant Serif", display: '"Cormorant Garamond", serif', body: '"Lora", serif' },
        tech: { id: "tech", name: "Tech", display: '"Space Grotesk", sans-serif', body: '"IBM Plex Mono", monospace' },
        digital: { id: "digital", name: "Digital", display: '"Share Tech Mono", monospace', body: '"Space Grotesk", sans-serif' },
        futuristic: { id: "futuristic", name: "Futuristic", display: '"Oxanium", sans-serif', body: '"Rajdhani", sans-serif' },
        hud: { id: "hud", name: "HUD", display: '"Rajdhani", sans-serif', body: '"Chakra Petch", sans-serif' },
        brush: { id: "brush", name: "Brush Oriental", display: '"Shippori Mincho", serif', body: '"Noto Sans JP", sans-serif' },
        minimal: { id: "minimal", name: "Minimal", display: '"Manrope", sans-serif', body: '"Inter", sans-serif' },
        manuscript: { id: "manuscript", name: "Manuscript", display: '"Caveat", cursive', body: '"EB Garamond", serif' },
        script: { id: "script", name: "Magic Script", display: '"Great Vibes", cursive', body: '"Cormorant", serif' },
        darkfantasy: { id: "darkfantasy", name: "Dark Fantasy", display: '"Cinzel", serif', body: '"Alegreya SC", serif' },
        royal: { id: "royal", name: "Royal", display: '"Cinzel", serif', body: '"Playfair Display", serif' },
        ancientbook: { id: "ancientbook", name: "Ancient Book", display: '"EB Garamond", serif', body: '"Spectral", serif' }
    };

    Arquimago.WALLPAPERS = {
        auto: { id: "auto", name: "Automático", desc: "Usa o wallpaper do Template ativo.", src: null },
        custom: { id: "custom", name: "Da galeria", desc: "Use uma imagem da sua galeria como papel de parede.", src: "" }
    };

    Arquimago.MISSIONS = {
        main: [
            { id: "main_treino", name: "Treino", desc: "Uma sessão de treino completa para fortalecer o corpo.", objective: "Realizar uma sessão completa de exercícios", category: "Corpo", xp: 7, bossDamage: 30, attribute: "strength", icon: "🏋️" },
            { id: "main_caminhada", name: "Caminhada", desc: "Uma caminhada longa para clarear a mente e o corpo.", objective: "Fazer uma caminhada longa ao ar livre", category: "Corpo", xp: 5, bossDamage: 20, attribute: "strength", icon: "🚶" },
            { id: "main_alongamento", name: "Alongamento", desc: "Movimentos suaves para liberar tensões e preparar o espírito.", objective: "Praticar movimentos de alongamento", category: "Corpo", xp: 4, bossDamage: 15, attribute: "strength", icon: "🤸" },
            { id: "main_agua", name: "Água", desc: "Hidrate-se com consistência ao longo do dia.", objective: "Manter-se hidratado durante o dia", category: "Corpo", xp: 2, bossDamage: 10, attribute: "vitality", icon: "💧" },
            { id: "main_alimentacao", name: "Alimentação", desc: "Escolha uma refeição equilibrada e consciente.", objective: "Escolher uma refeição equilibrada", category: "Corpo", xp: 4, bossDamage: 18, attribute: "vitality", icon: "🍎" },
            { id: "main_sono", name: "Sono", desc: "Descanse em hora adequada para recuperar força.", objective: "Dormir em horário adequado", category: "Corpo", xp: 5, bossDamage: 35, attribute: "vitality", icon: "😴" }
        ],
        daily: [
            { id: "daily_tempo_qualidade", name: "Tempo de qualidade", desc: "Momento presente e gratuito com quem importa.", objective: "Dedicar tempo de qualidade a alguém", category: "Vida", xp: 3, bossDamage: 12, attribute: "spirit", icon: "⏳" },
            { id: "daily_pesquisa_vagabond", name: "Pesquisa Vagabond", desc: "Aprofunde-se na história e nos temas de Vagabond.", objective: "Pesquisar sobre o mangá Vagabond", category: "Mente", xp: 4, bossDamage: 16, attribute: "intelligence", icon: "🗡️" },
            { id: "daily_primeiro_manga", name: "1er mangá", desc: "Dê o primeiro passo na leitura do seu mangá.", objective: "Ler o primeiro mangá", category: "Mente", xp: 4, bossDamage: 14, attribute: "intelligence", icon: "📖" },
            { id: "daily_tres_bencoes", name: "3 bençãos", desc: "Reconheça e registre três bênçãos do dia.", objective: "Anotar 3 bençãos do dia", category: "Mente", xp: 3, bossDamage: 15, attribute: "spirit", icon: "❤️‍🔥" },
            { id: "daily_podcast", name: "Podcast", desc: "Aprenda algo novo enquanto ouve um podcast.", objective: "Ouvir um episódio de podcast", category: "Mente", xp: 4, bossDamage: 16, attribute: "intelligence", icon: "🧠" },
            { id: "daily_musculacao", name: "Musculação", desc: "Sessão focada para construir força e presença.", objective: "Treinar musculação no dia", category: "Corpo", xp: 5, bossDamage: 22, attribute: "strength", icon: "🏆" },
            { id: "daily_the_news", name: "The news", desc: "Fique por dentro das notícias do mundo.", objective: "Acompanhar as notícias do dia", category: "Mente", xp: 3, bossDamage: 12, attribute: "intelligence", icon: "📰" },
            { id: "daily_chess", name: "Chess", desc: "Um jogo de xadrez para treinar a mente.", objective: "Jogar uma partida de xadrez", category: "Mente", xp: 4, bossDamage: 14, attribute: "intelligence", icon: "♟️" },
            { id: "daily_conteudo_barbearia", name: "Criação de conteúdo barbearia", desc: "Produza conteúdo para crescer a barbearia.", objective: "Criar conteúdo para a barbearia", category: "Produtividade", xp: 5, bossDamage: 18, attribute: "intelligence", icon: "📈" },
            { id: "daily_leitura_diaria", name: "Leitura diária", desc: "Leia por 20 minutos e amplie sua visão.", objective: "Ler por 20 minutos", category: "Mente", xp: 5, bossDamage: 20, attribute: "intelligence", icon: "📚" },
            { id: "daily_estudo_dia", name: "Estudo do dia", desc: "Dedique um tempo a aprender algo novo.", objective: "Aprender algo novo hoje", category: "Mente", xp: 6, bossDamage: 24, attribute: "intelligence", icon: "📖" },
            { id: "daily_bonus_dia", name: "Bônus: Missão do dia", desc: "Uma missão bônus para turbinar o progresso de hoje.", objective: "Completar a missão bônus do dia", category: "Mente", xp: 6, bossDamage: 20, attribute: "spirit", icon: "📜" },
            { id: "daily_contabilidade", name: "Contabilidade diária", desc: "Registre e acompanhe as finanças do dia.", objective: "Atualizar a contabilidade do dia", category: "Produtividade", xp: 4, bossDamage: 16, attribute: "intelligence", icon: "💸" },
            { id: "daily_frio", name: "Frio", desc: "Encare o frio por alguns instantes e desperte o corpo.", objective: "Enfrentar o frio hoje", category: "Corpo", xp: 3, bossDamage: 14, attribute: "vitality", icon: "🥶" },
            { id: "daily_meditacao_10min", name: "Meditação (10 minutos)", desc: "10 minutos de silêncio para acalmar a mente.", objective: "Meditar por 10 minutos", category: "Mente", xp: 4, bossDamage: 20, attribute: "spirit", icon: "🪷" },
            { id: "daily_mentalizacao", name: "Mentalização", desc: "Visualize com clareza o dia e os seus objetivos.", objective: "Praticar a mentalização do dia", category: "Mente", xp: 3, bossDamage: 15, attribute: "spirit", icon: "☁️" }
        ],
        weekly: [
            { id: "weekly_planejamento", name: "Planejamento", desc: "Organize seus objetivos da semana com clareza.", objective: "Organizar objetivos da semana", category: "Produtividade", xp: 6, bossDamage: 24, attribute: "intelligence", icon: "🎯" },
            { id: "weekly_trabalho", name: "Trabalho", desc: "Conclua uma etapa importante de seu projeto.", objective: "Concluir uma etapa importante", category: "Produtividade", xp: 8, bossDamage: 28, attribute: "intelligence", icon: "💼" },
            { id: "weekly_projeto", name: "Projeto Arquimago", desc: "Acelere um avanço concreto no projeto da jornada.", objective: "Acelerar avanço no projeto", category: "Produtividade", xp: 8, bossDamage: 30, attribute: "intelligence", icon: "🔮" },
            { id: "weekly_organizacao", name: "Organização", desc: "Revise e organize seu espaço e suas prioridades.", objective: "Revisar e organizar espaço", category: "Produtividade", xp: 5, bossDamage: 22, attribute: "intelligence", icon: "🗂️" },
            { id: "weekly_revisao", name: "Revisão", desc: "Reveja seu progresso e ajuste sua direção.", objective: "Rever progresso e ajustar direção", category: "Produtividade", xp: 5, bossDamage: 20, attribute: "intelligence", icon: "🔍" }
        ],
        habits: [
            { id: "habit_limpeza", name: "Limpeza", desc: "Mantenha seu ambiente mais sereno e ordenado.", objective: "Manter ambiente sereno e ordenado", category: "Vida", xp: 4, bossDamage: 16, attribute: "spirit", icon: "🧹" },
            { id: "habit_familia", name: "Família", desc: "Reserve um tempo para quem é importante.", objective: "Reservar tempo para entes queridos", category: "Vida", xp: 4, bossDamage: 18, attribute: "spirit", icon: "👨‍👩‍👧" },
            { id: "habit_lazer", name: "Lazer saudável", desc: "Descanse com algo leve e prazeroso.", objective: "Descansar com algo leve e prazeroso", category: "Vida", xp: 3, bossDamage: 12, attribute: "spirit", icon: "🎮" },
            { id: "habit_descanso", name: "Descanso", desc: "Pare por um tempo e recupere sua energia.", objective: "Parar e recuperar energia", category: "Vida", xp: 4, bossDamage: 22, attribute: "vitality", icon: "🛌" }
        ]
    };

    Arquimago.NATIVE_MISSION_ICONS = {
        main_treino: "🏋️",
        main_caminhada: "🚶",
        main_alongamento: "🤸",
        main_agua: "💧",
        main_alimentacao: "🍎",
        main_sono: "😴",
        daily_tempo_qualidade: "⏳",
        daily_pesquisa_vagabond: "🗡️",
        daily_primeiro_manga: "📖",
        daily_tres_bencoes: "❤️‍🔥",
        daily_podcast: "🧠",
        daily_musculacao: "🏆",
        daily_the_news: "📰",
        daily_chess: "♟️",
        daily_conteudo_barbearia: "📈",
        daily_leitura_diaria: "📚",
        daily_estudo_dia: "📖",
        daily_bonus_dia: "📜",
        daily_contabilidade: "💸",
        daily_frio: "🥶",
        daily_meditacao_10min: "🪷",
        daily_mentalizacao: "☁️",
        weekly_planejamento: "🎯",
        weekly_trabalho: "💼",
        weekly_projeto: "🔮",
        weekly_organizacao: "🗂️",
        weekly_revisao: "🔍",
        habit_limpeza: "🧹",
        habit_familia: "👨‍👩‍👧",
        habit_lazer: "🎮",
        habit_descanso: "🛌"
    };

    Arquimago.MISSION_ICON_CATEGORIES = [
        { id: "saude", label: "Saúde" },
        { id: "esporte", label: "Esporte" },
        { id: "estudos", label: "Estudos" },
        { id: "trabalho", label: "Trabalho" },
        { id: "casa", label: "Casa" },
        { id: "alimentacao", label: "Alimentação" },
        { id: "espiritualidade", label: "Espiritualidade" },
        { id: "tecnologia", label: "Tecnologia" },
        { id: "lazer", label: "Lazer" },
        { id: "financas", label: "Finanças" },
        { id: "habitos", label: "Hábitos" },
        { id: "objetivos", label: "Objetivos" }
    ];

    Arquimago.MISSION_ICONS = [
        { key: "stethoscope", emoji: "🩺", name: "Estetoscópio", category: "saude" },
        { key: "pill", emoji: "💊", name: "Remédio", category: "saude" },
        { key: "hospital", emoji: "🏥", name: "Hospital", category: "saude" },
        { key: "tooth", emoji: "🦷", name: "Dente", category: "saude" },
        { key: "heart-organs", emoji: "🫀", name: "Coração", category: "saude" },
        { key: "lotion", emoji: "🧴", name: "Loção", category: "saude" },
        { key: "toothbrush", emoji: "🪥", name: "Escova", category: "saude" },
        { key: "bandage", emoji: "❤️‍🩹", name: "Cuidado", category: "saude" },
        { key: "strength", emoji: "💪", name: "Força", category: "saude" },
        { key: "run", emoji: "🏃", name: "Corrida", category: "esporte" },
        { key: "walk", emoji: "🚶", name: "Caminhada", category: "esporte" },
        { key: "gym", emoji: "🏋️", name: "Treino", category: "esporte" },
        { key: "swim", emoji: "🏊", name: "Natação", category: "esporte" },
        { key: "bike", emoji: "🚴", name: "Bicicleta", category: "esporte" },
        { key: "soccer", emoji: "⚽", name: "Futebol", category: "esporte" },
        { key: "basketball", emoji: "🏀", name: "Basquete", category: "esporte" },
        { key: "tennis", emoji: "🎾", name: "Tênis", category: "esporte" },
        { key: "basket", emoji: "⛹️", name: "Arremesso", category: "esporte" },
        { key: "books", emoji: "📚", name: "Livros", category: "estudos" },
        { key: "book", emoji: "📖", name: "Livro", category: "estudos" },
        { key: "pencil", emoji: "✏️", name: "Lápis", category: "estudos" },
        { key: "notes", emoji: "📝", name: "Anotações", category: "estudos" },
        { key: "brain", emoji: "🧠", name: "Mente", category: "estudos" },
        { key: "graduation", emoji: "🎓", name: "Formação", category: "estudos" },
        { key: "microscope", emoji: "🔬", name: "Laboratório", category: "estudos" },
        { key: "test-tube", emoji: "🧪", name: "Experimento", category: "estudos" },
        { key: "ruler", emoji: "📐", name: "Geometria", category: "estudos" },
        { key: "briefcase", emoji: "💼", name: "Trabalho", category: "trabalho" },
        { key: "laptop", emoji: "💻", name: "Notebook", category: "trabalho" },
        { key: "chart", emoji: "📊", name: "Gráfico", category: "trabalho" },
        { key: "growth", emoji: "📈", name: "Crescimento", category: "trabalho" },
        { key: "folder", emoji: "🗂️", name: "Organização", category: "trabalho" },
        { key: "alarm", emoji: "⏰", name: "Despertador", category: "trabalho" },
        { key: "calendar", emoji: "🗓️", name: "Calendário", category: "trabalho" },
        { key: "phone", emoji: "📞", name: "Telefone", category: "trabalho" },
        { key: "desktop", emoji: "🖥️", name: "Computador", category: "trabalho" },
        { key: "broom", emoji: "🧹", name: "Limpeza", category: "casa" },
        { key: "laundry", emoji: "🧺", name: "Lavanderia", category: "casa" },
        { key: "soap", emoji: "🧼", name: "Sabão", category: "casa" },
        { key: "cart", emoji: "🛒", name: "Compras", category: "casa" },
        { key: "plate", emoji: "🍽️", name: "Mesa", category: "casa" },
        { key: "toilet-paper", emoji: "🧻", name: "Suprimentos", category: "casa" },
        { key: "plant", emoji: "🪴", name: "Plantas", category: "casa" },
        { key: "bathtub", emoji: "🛁", name: "Banho", category: "casa" },
        { key: "apple", emoji: "🍎", name: "Frutas", category: "alimentacao" },
        { key: "salad", emoji: "🥗", name: "Salada", category: "alimentacao" },
        { key: "cooking", emoji: "🍳", name: "Cozinhar", category: "alimentacao" },
        { key: "juice", emoji: "🥤", name: "Bebida", category: "alimentacao" },
        { key: "water", emoji: "💧", name: "Hidratação", category: "alimentacao" },
        { key: "faucet", emoji: "🚰", name: "Água", category: "alimentacao" },
        { key: "broccoli", emoji: "🥦", name: "Vegetais", category: "alimentacao" },
        { key: "meditate", emoji: "🧘", name: "Meditação", category: "espiritualidade" },
        { key: "om", emoji: "🕉️", name: "Om", category: "espiritualidade" },
        { key: "prayer-beads", emoji: "📿", name: "Oração", category: "espiritualidade" },
        { key: "pray", emoji: "🙏", name: "Gratidão", category: "espiritualidade" },
        { key: "candle", emoji: "🕯️", name: "Vela", category: "espiritualidade" },
        { key: "herb", emoji: "🌿", name: "Natureza", category: "espiritualidade" },
        { key: "nazar", emoji: "🧿", name: "Proteção", category: "espiritualidade" },
        { key: "yin-yang", emoji: "☯️", name: "Equilíbrio", category: "espiritualidade" },
        { key: "keyboard", emoji: "⌨️", name: "Teclado", category: "tecnologia" },
        { key: "mouse", emoji: "🖱️", name: "Mouse", category: "tecnologia" },
        { key: "smartphone", emoji: "📱", name: "Celular", category: "tecnologia" },
        { key: "plug", emoji: "🔌", name: "Energia", category: "tecnologia" },
        { key: "robot", emoji: "🤖", name: "Robô", category: "tecnologia" },
        { key: "disk", emoji: "💾", name: "Armazenamento", category: "tecnologia" },
        { key: "lock", emoji: "🔐", name: "Segurança", category: "tecnologia" },
        { key: "music", emoji: "🎵", name: "Música", category: "lazer" },
        { key: "art", emoji: "🎨", name: "Arte", category: "lazer" },
        { key: "game", emoji: "🎮", name: "Jogos", category: "lazer" },
        { key: "movie", emoji: "🎬", name: "Filmes", category: "lazer" },
        { key: "headphones", emoji: "🎧", name: "Áudio", category: "lazer" },
        { key: "camera", emoji: "📷", name: "Fotografia", category: "lazer" },
        { key: "mic", emoji: "🎤", name: "Música ao vivo", category: "lazer" },
        { key: "dice", emoji: "🎲", name: "Jogos de tabuleiro", category: "lazer" },
        { key: "money", emoji: "💰", name: "Dinheiro", category: "financas" },
        { key: "card", emoji: "💳", name: "Cartão", category: "financas" },
        { key: "bank", emoji: "🏦", name: "Banco", category: "financas" },
        { key: "chart-down", emoji: "📉", name: "Redução", category: "financas" },
        { key: "coin", emoji: "🪙", name: "Moeda", category: "financas" },
        { key: "cash", emoji: "💸", name: "Gastos", category: "financas" },
        { key: "sleep", emoji: "😴", name: "Sono", category: "habitos" },
        { key: "stand", emoji: "🧍", name: "Postura", category: "habitos" },
        { key: "bed", emoji: "🛌", name: "Descanso", category: "habitos" },
        { key: "target", emoji: "🎯", name: "Objetivo", category: "objetivos" },
        { key: "trophy", emoji: "🏆", name: "Troféu", category: "objetivos" },
        { key: "star", emoji: "⭐", name: "Estrela", category: "objetivos" },
        { key: "rocket", emoji: "🚀", name: "Avanço", category: "objetivos" },
        { key: "fire", emoji: "🔥", name: "Progresso", category: "objetivos" },
        { key: "crown", emoji: "👑", name: "Realeza", category: "objetivos" },
        { key: "sparkle", emoji: "🌟", name: "Brilho", category: "objetivos" },
        { key: "gym-2", emoji: "🧗", name: "Escalada", category: "esporte" },
        { key: "stretch", emoji: "🤸", name: "Alongamento", category: "esporte" },
        { key: "sparkles", emoji: "✨", name: "Magia", category: "objetivos" }
    ];

    Arquimago.xpRequiredForLevel = function (level) {
        var step = Math.max(0, level - 1);
        return Math.floor(100 + (step * 30) + (step * step * 5));
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

    Arquimago.getClassIndex = function (state) {
        state = state || Arquimago.state;
        var index = state ? parseInt(state.classIndex, 10) : 0;
        if (!isFinite(index)) index = 0;
        return Math.max(0, Math.min(Arquimago.CLASS_DEFINITIONS.length - 1, index));
    };

    Arquimago.getClassDefinition = function (state) {
        return Arquimago.CLASS_DEFINITIONS[Arquimago.getClassIndex(state)] || Arquimago.CLASS_DEFINITIONS[0];
    };

    Arquimago.getCharacterClass = function (state) {
        return Arquimago.getClassDefinition(state).name;
    };

    Arquimago.getCharacterName = function () {
        var name = (Arquimago.state && Arquimago.state.name) || "";
        name = String(name).trim();
        if (!name || name === "Arquimago Jordan") return "";
        return name;
    };

    Arquimago.getDisplayName = function () {
        return Arquimago.getCharacterName() || Arquimago.getCharacterClass();
    };

    Arquimago.getMageImageSrc = function () {
        var src = "assets/characters/arquimago_down.png";
        if (Arquimago.state && Arquimago.state.customAvatar) {
            src = Arquimago.state.customAvatar;
        }
        return src;
    };

    Arquimago.getMageImage = function () {
        return '<img src="' + Arquimago.getMageImageSrc() + '" alt="' + Arquimago.getCharacterClass() + '" class="mage-avatar-img">';
    };

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
