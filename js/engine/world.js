export const TILE = 32;

export const T = {
    GRASS: 0, DIRT: 1, STONE: 2, SAND: 3, WOOD_FLOOR: 4, CRYSTAL_FLOOR: 5,
    WATER: 6, BRIDGE: 7, DARK_STONE: 8, TEMPLE_FLOOR: 9,
    TREE: 10, ROCK: 11, WALL: 12, BUSH: 13, BOOKSHELF: 14,
    PILLAR: 15, FENCE: 16, DARK_WALL: 17, RUIN: 18, TALL_GRASS: 19,
};

const SOLID = new Set([T.TREE, T.ROCK, T.WALL, T.BUSH, T.BOOKSHELF, T.PILLAR, T.FENCE, T.DARK_WALL, T.WATER, T.RUIN]);

export function isSolid(tileId) {
    return SOLID.has(tileId);
}

function row(...tiles) { return tiles; }

export const PHASES = {
    floresta_arcana: {
        id: "floresta_arcana",
        name: "Floresta Arcana",
        desc: "Uma floresta antiga onde árvores milenares guardam segredos esquecidos.",
        chapter: 1,
        bgColor: "#0a1a0a",
        bgGradient: ["#061206", "#0d1f0d", "#030803"],
        ambientParticles: { color: "#4a7f4a", count: 18, speed: 6 },
    },
    ruinas_antigas: {
        id: "ruinas_antigas",
        name: "Ruínas Antigas",
        desc: "Pilares quebrados e inscrições antigas contam a história de um poder perdido.",
        chapter: 2,
        bgColor: "#120e10",
        bgGradient: ["#0e0a0e", "#1a121a", "#080608"],
        ambientParticles: { color: "#8a6a4a", count: 12, speed: 4 },
    },
    entrada_masmorra: {
        id: "entrada_masmorra",
        name: "Entrada da Masmorra",
        desc: "A escuridão aguarda. Algo ancestral pulsa nas profundezas.",
        chapter: 3,
        bgColor: "#050510",
        bgGradient: ["#030308", "#0a0a1a", "#020206"],
        ambientParticles: { color: "#6a4aaa", count: 22, speed: 3 },
    },
};

export const ROOMS = {
    floresta_arcana: {
        name: "Floresta Arcana",
        phase: "floresta_arcana",
        width: 20, height: 15,
        tileMap: [
            row(10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10),
            row(10, 0, 0,13, 0, 0,19, 0, 0, 0, 0, 0,19, 0, 0,13, 0, 0, 0,10),
            row(10, 0, 0, 0, 0, 0, 0, 0,11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,10),
            row(10,13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,13, 0,10),
            row(10, 0, 0, 0,19, 0, 0, 0, 0, 0, 0, 0, 0, 0,19, 0, 0, 0, 0,10),
            row(10, 0, 0, 0, 0, 0, 0, 0, 0, 0,11, 0, 0, 0, 0, 0, 0, 0, 0,10),
            row( 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,10),
            row( 0, 0, 0, 0, 0,13, 0, 0, 0, 0, 0, 0, 0,13, 0, 0, 0, 0, 0,10),
            row(10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,10),
            row(10, 0,19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,19, 0, 0,10),
            row(10, 0, 0, 0, 0, 0,11, 0, 0, 0, 0, 0,11, 0, 0, 0, 0, 0, 0,10),
            row(10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,10),
            row(10,13, 0, 0, 0, 0, 0, 0,13, 0, 0,13, 0, 0, 0, 0, 0, 0,13,10),
            row(10,10,10,10,10,10,10, 0, 0, 0, 0, 0, 0,10,10,10,10,10,10,10),
            row(10,10,10,10,10,10,10, 0, 0, 0, 0, 0, 0,10,10,10,10,10,10,10),
        ],
        objects: [
            { type: "crystal", x: 4, y: 2, id: "fa_crystal1", color: "#7b68ee", label: "Cristal Arcano" },
            { type: "crystal", x: 15, y: 4, id: "fa_crystal2", color: "#44ccaa", label: "Cristal da Floresta" },
            { type: "crystal", x: 10, y: 9, id: "fa_crystal3", color: "#7b68ee", label: "Fragmento de Memória" },
            { type: "book", x: 7, y: 5, id: "fa_book1", label: "Tomo Antigo",
              title: "Tomo dos Primeiros Sussurros",
              text: "Nas eras anteriores, a floresta era um templo. Cada árvore era um guardião. Cada sussurro, uma oração. Os primeiros arquimagos nasceram aqui, entre as raízes do conhecimento." },
            { type: "book", x: 14, y: 10, id: "fa_book2", label: "Pergaminho Antigo",
              title: "Pergaminho do Despertar",
              text: "A magia não é um dom. É um fardo. Aqueles que a carregam nunca mais serão os mesmos. O poder transforma, mas também destrói. Escolha sabiamente o caminho que trilhará." },
            { type: "torch", x: 2, y: 1, id: "fa_torch1", lit: true },
            { type: "torch", x: 17, y: 8, id: "fa_torch2", lit: true },
            { type: "potion", x: 12, y: 6, id: "fa_potion1", color: "#ff4444", label: "Poção de Vida" },
            { type: "plant", x: 6, y: 8, id: "fa_plant1", color: "#44aa44", label: "Erva Mágica" },
            { type: "plant", x: 13, y: 3, id: "fa_plant2", color: "#44ccaa", label: "Folha Luminosa" },
            { type: "ancient_stone", x: 3, y: 11, id: "fa_stone1" },
        ],
        npcs: [
            {
                name: "Espírito da Floresta", x: 8, y: 4, color: "#88ccff",
                dialogue: [
                    { speaker: "Espírito da Floresta", text: "Você caminha entre as árvores ancestrais... elas reconhecem sua presença." },
                    { speaker: "Espírito da Floresta", text: "Há muito tempo, este lugar era o coração de um grande reino de magia." },
                    { speaker: "Espírito da Floresta", text: "Os cristais que encontra são fragmentos de memórias antigas. Colete-os com reverência." },
                    { speaker: "Espírito da Floresta", text: "Cada fragmento restaurado aproxima você da verdade sobre sua origem." },
                    { speaker: "Espírito da Floresta", text: "Siga para o sul quando estiver pronto. As Ruínas Antigas aguardam." },
                ],
            },
            {
                name: "Viajante Perdido", x: 14, y: 7, color: "#aa8844",
                dialogue: [
                    { speaker: "Viajante Perdido", text: "Não consigo encontrar a saída desta floresta... há anos." },
                    { speaker: "Viajante Perdido", text: "Mas não me importo mais. A floresta me acolheu." },
                    { speaker: "Viajante Perdido", text: "Os sussurros das árvores contam histórias de um mundo que já não existe." },
                    { speaker: "Viajante Perdido", text: "Cuidado com as ruínas ao sul. Lá, o tempo parou." },
                ],
            },
        ],
        exits: [
            { x: 7, y: 14, w: 3, h: 1, target: "ruinas_antigas", tx: 10, ty: 1 },
            { x: 10, y: 14, w: 3, h: 1, target: "ruinas_antigas", tx: 10, ty: 1 },
        ],
    },

    ruinas_antigas: {
        name: "Ruínas Antigas",
        phase: "ruinas_antigas",
        width: 20, height: 14,
        tileMap: [
            row(18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18,18),
            row(18, 9, 9, 9, 9,15, 9, 9, 9, 9, 9, 9, 9, 9,15, 9, 9, 9, 9,18),
            row(18, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,18),
            row(18, 9, 9,18, 9, 9, 9, 9,11, 9, 9,11, 9, 9, 9, 9,18, 9, 9,18),
            row(18, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,18),
            row(18, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,18),
            row( 0, 0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 0,18),
            row( 0, 0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 0,18),
            row(18, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,18),
            row(18, 9, 9,18, 9, 9, 9, 9,11, 9, 9,11, 9, 9, 9, 9,18, 9, 9,18),
            row(18, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,18),
            row(18, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,18),
            row(18,18,18,18,18,18,18,18, 0, 0, 0, 0,18,18,18,18,18,18,18,18),
            row(18,18,18,18,18,18,18,18, 0, 0, 0, 0,18,18,18,18,18,18,18,18),
        ],
        objects: [
            { type: "altar", x: 9, y: 4, id: "ra_altar1" },
            { type: "altar", x: 10, y: 4, id: "ra_altar2" },
            { type: "monument", x: 5, y: 6, id: "ra_monument1" },
            { type: "monument", x: 14, y: 8, id: "ra_monument2" },
            { type: "crystal", x: 3, y: 2, id: "ra_crystal1", color: "#ff6644", label: "Cristal Rubro" },
            { type: "crystal", x: 16, y: 10, id: "ra_crystal2", color: "#ffaa00", label: "Cristal Dourado" },
            { type: "chest", x: 16, y: 2, id: "ra_chest1", opened: false, contains: "memory_fragment", label: "Relicário Antigo" },
            { type: "chest", x: 3, y: 10, id: "ra_chest2", opened: false, contains: "mana_shard", label: "Baú das Ruínas" },
            { type: "torch", x: 1, y: 0, id: "ra_torch1", lit: true },
            { type: "torch", x: 18, y: 0, id: "ra_torch2", lit: true },
            { type: "torch", x: 1, y: 12, id: "ra_torch3", lit: true },
            { type: "torch", x: 18, y: 12, id: "ra_torch4", lit: true },
            { type: "ancient_stone", x: 7, y: 2, id: "ra_stone1" },
            { type: "ancient_stone", x: 12, y: 10, id: "ra_stone2" },
            { type: "potion", x: 8, y: 8, id: "ra_potion1", color: "#4488ff", label: "Poção de Mana" },
        ],
        npcs: [
            {
                name: "Guardião das Ruínas", x: 10, y: 7, color: "#c9a84c",
                dialogue: [
                    { speaker: "Guardião das Ruínas", text: "Você ousou entrar nas Ruínas de Asterion..." },
                    { speaker: "Guardião das Ruínas", text: "Estas paredes guardam a história de um grande império que caiu." },
                    { speaker: "Guardião das Ruínas", text: "O imperador Asterion buscava o poder absoluto. E o encontrou." },
                    { speaker: "Guardião das Ruínas", text: "Mas o poder absoluto tem um preço: a humanidade." },
                    { speaker: "Guardião das Ruínas", text: "Ele transformou sua alma em cristais, fragmentando-se para sempre." },
                    { speaker: "Guardião das Ruínas", text: "Ao norte está a Floresta. Ao leste, a entrada da Masmorra." },
                ],
            },
            {
                name: "Eco do Passado", x: 6, y: 9, color: "#886644",
                dialogue: [
                    { speaker: "Eco do Passado", text: "Eu também fui um caçador... até que encontrei esta lugar." },
                    { speaker: "Eco do Passado", text: "As inscrições nos altares contam verdades que preferimos esquecer." },
                    { speaker: "Eco do Passado", text: "O sistema que governa este mundo não é natural. Foi criado." },
                    { speaker: "Eco do Passado", text: "E quem o criou... ainda observa." },
                ],
            },
        ],
        exits: [
            { x: 0, y: 6, w: 1, h: 2, target: "floresta_arcana", tx: 18, ty: 7 },
            { x: 18, y: 6, w: 2, h: 2, target: "entrada_masmorra", tx: 1, ty: 7 },
            { x: 8, y: 13, w: 4, h: 1, target: "entrada_masmorra", tx: 9, ty: 1 },
        ],
    },

    entrada_masmorra: {
        name: "Entrada da Masmorra",
        phase: "entrada_masmorra",
        width: 18, height: 13,
        tileMap: [
            row(17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17),
            row(17, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,17),
            row(17, 8, 8, 8, 8, 8,11, 8, 8, 8, 8,11, 8, 8, 8, 8, 8,17),
            row(17, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,17),
            row(17, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,17),
            row(17, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,17),
            row( 0, 0, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 0,17),
            row( 0, 0, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 0,17),
            row(17, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,17),
            row(17, 8, 8, 8,11, 8, 8, 8, 8, 8, 8, 8,11, 8, 8, 8, 8,17),
            row(17, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,17),
            row(17, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,17),
            row(17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17),
        ],
        objects: [
            { type: "portal", x: 8, y: 6, id: "em_portal1", label: "Portal da Masmorra" },
            { type: "portal", x: 9, y: 6, id: "em_portal2", label: "Portal Profundo" },
            { type: "crystal", x: 4, y: 3, id: "em_crystal1", color: "#aa44ff", label: "Cristal Sombrio" },
            { type: "crystal", x: 13, y: 3, id: "em_crystal2", color: "#aa44ff", label: "Cristal Sombrio" },
            { type: "crystal", x: 8, y: 9, id: "em_crystal3", color: "#ff4488", label: "Cristal Rubro" },
            { type: "altar", x: 8, y: 4, id: "em_altar1" },
            { type: "altar", x: 9, y: 4, id: "em_altar2" },
            { type: "ancient_stone", x: 3, y: 8, id: "em_stone1" },
            { type: "ancient_stone", x: 14, y: 8, id: "em_stone2" },
            { type: "torch", x: 2, y: 1, id: "em_torch1", lit: true },
            { type: "torch", x: 15, y: 1, id: "em_torch2", lit: true },
            { type: "torch", x: 2, y: 11, id: "em_torch3", lit: true },
            { type: "torch", x: 15, y: 11, id: "em_torch4", lit: true },
            { type: "potion", x: 12, y: 10, id: "em_potion1", color: "#ff4444", label: "Poção de Vida" },
            { type: "book", x: 5, y: 10, id: "em_book1", label: "Crônica Proibida",
              title: "Crônica do Vazio",
              text: "A masmorra não é apenas um lugar. É uma entidade. Ela respira. Ela observa. E quando você desce o suficiente, ela começa a observar de volta. Os caçadores que entraram nunca mais foram os mesmos." },
        ],
        npcs: [
            {
                name: "Guardião do Portal", x: 6, y: 7, color: "#aa44ff",
                dialogue: [
                    { speaker: "Guardião do Portal", text: "Você chegou ao limiar da escuridão, Arquimago." },
                    { speaker: "Guardião do Portal", text: "A masmorra abaixo é o coração do sistema. Tudo começou lá." },
                    { speaker: "Guardião do Portal", text: "Os cristais que coletou são chaves. Cada um abre um fragmento da verdade." },
                    { speaker: "Guardião do Portal", text: "Quando estiver pronto, atravesse o portal. Mas saiba: não há volta." },
                    { speaker: "Guardião do Portal", text: "A jornada do caçador sempre termina no confronto consigo mesmo." },
                    { speaker: "Guardião do Portal", text: "Força, Arquimago. A escuridão respeita apenas a vontade." },
                ],
            },
            {
                name: "Espírito Ancião", x: 12, y: 5, color: "#8844aa",
                dialogue: [
                    { speaker: "Espírito Ancião", text: "Há eras, Asterion caminhou por este mesmo corredor." },
                    { speaker: "Espírito Ancião", text: "Ele era como você. Jovem. Ambicioso. Cheio de sonhos." },
                    { speaker: "Espírito Ancião", text: "Mas o poder que encontrou nas profundezas mudou tudo." },
                    { speaker: "Espírito Ancião", text: "Ele fragmentou sua própria alma para se tornar eterno." },
                    { speaker: "Espírito Ancião", text: "Os cristais que encontra são pedaços dele. E talvez... de você também." },
                ],
            },
        ],
        exits: [
            { x: 0, y: 6, w: 1, h: 2, target: "ruinas_antigas", tx: 17, ty: 7 },
            { x: 8, y: 12, w: 3, h: 1, target: "ruinas_antigas", tx: 10, ty: 12 },
        ],
    },
};

export function getRoom(key) {
    return ROOMS[key] || null;
}

export function getRoomList() {
    return Object.keys(ROOMS).map(k => ({ key: k, name: ROOMS[k].name }));
}

export function getPhaseForRoom(roomKey) {
    const room = ROOMS[roomKey];
    if (!room) return null;
    return PHASES[room.phase] || null;
}
