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

export const ROOMS = {
    forest_clearing: {
        name: "Clareira do Despertar",
        desc: "Onde o Arquimago desperta sem memórias.",
        width: 16, height: 12,
        bg: "#0d1f0d",
        tileMap: [
            row(10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10),
            row(10, 0, 0,13, 0, 0, 0, 0, 0, 0,13, 0, 0, 0, 0,10),
            row(10, 0, 0, 0, 0, 0,11, 0, 0, 0, 0, 0,19, 0, 0,10),
            row(10,13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,10),
            row(10, 0, 0, 0, 0, 0, 0, 0, 0,11, 0, 0, 0, 0,13,10),
            row(10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,10),
            row(10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,10),
            row(10, 0,19, 0, 0, 0,11, 0, 0, 0, 0, 0, 0, 0, 0,10),
            row(10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,19, 0, 0,10),
            row(10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10),
            row(10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10),
            row(10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10),
        ],
        objects: [
            { type: "crystal", x: 8, y: 2, id: "fc_crystal1", color: "#7b68ee", label: "Cristal de Memória" },
            { type: "monument", x: 7, y: 5, id: "fc_monument" },
            { type: "torch", x: 2, y: 0, id: "fc_torch1", lit: true },
            { type: "torch", x: 13, y: 0, id: "fc_torch2", lit: true },
        ],
        npcs: [
            {
                name: "Espírito Ancestral", x: 5, y: 3, color: "#88ccff",
                dialogue: [
                    { speaker: "Espírito", text: "Você... finalmente despertou." },
                    { speaker: "Espírito", text: "O Arquimago perdeu quase todos os seus poderes." },
                    { speaker: "Espírito", text: "Fragmentos de memória estão espalhados por estas terras." },
                    { speaker: "Espírito", text: "Encontre-os. Cada um restaurará parte do que você era." },
                    { speaker: "Espírito", text: "Há um cristal brilhando ao norte. Comece por ele." },
                ],
                questGiver: true, questId: "find_first_fragment",
            },
        ],
        enemies: [],
        exits: [
            { x: 15, y: 4, w: 1, h: 2, target: "whispering_woods", tx: 1, ty: 5 },
        ],
        ambientParticles: { color: "#4a7f4a", count: 15, speed: 8 },
    },

    whispering_woods: {
        name: "Floresta dos Sussurros",
        desc: "Árvores antigas sussurram segredos esquecidos.",
        width: 20, height: 14,
        bg: "#0a1a0a",
        tileMap: [
            row(10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10),
            row(10, 0, 0, 0,13, 0, 0, 0, 0,10, 0, 0, 0, 0, 0, 0,13, 0, 0,10),
            row(10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,11, 0, 0, 0, 0, 0, 0,10),
            row(10, 0,11, 0, 0, 0,19, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,11, 0,10),
            row(10, 0, 0, 0, 0, 0, 0, 0, 0, 0,13, 0, 0, 0, 0, 0, 0, 0, 0,10),
            row( 0, 0, 0, 0,11, 0, 0, 0, 0, 0, 0, 0, 0, 0,11, 0, 0, 0, 0,10),
            row(10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,10),
            row(10, 0, 0, 0, 0, 0, 0, 0,13, 0, 0, 0, 0, 0, 0, 0,13, 0, 0,10),
            row(10,13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,10),
            row(10, 0, 0, 0, 0,11, 0, 0, 0, 0, 0, 0, 0,11, 0, 0, 0, 0, 0,10),
            row(10, 0, 0, 0, 0, 0, 0, 0, 0, 0,19, 0, 0, 0, 0, 0, 0, 0, 0,10),
            row(10, 0, 0,13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,13, 0, 0, 0,10),
            row(10,10,10,10,10,10,10, 0,12,12,12, 0,10,10,10,10,10,10,10,10),
            row(10,10,10,10,10,10,10, 0, 0, 0, 0, 0,10,10,10,10,10,10,10,10),
        ],
        objects: [
            { type: "chest", x: 3, y: 2, id: "ww_chest1", opened: false, contains: "key", label: "Baú Antigo" },
            { type: "crystal", x: 17, y: 3, id: "ww_crystal1", color: "#00ccaa", label: "Cristal Verde" },
            { type: "book", x: 11, y: 8, id: "ww_book1", title: "Diário do Viajante", text: "Os espíritos desta floresta guardam o caminho para as Ruínas de Asterion." },
            { type: "torch", x: 7, y: 12, id: "ww_torch1", lit: true },
            { type: "torch", x: 10, y: 12, id: "ww_torch2", lit: true },
            { type: "potion", x: 14, y: 9, id: "ww_potion1", color: "#ff4444", label: "Poção de Vida" },
        ],
        npcs: [
            {
                name: "Guardião das Árvores", x: 9, y: 6, color: "#66cc66",
                dialogue: [
                    { speaker: "Guardião", text: "Bem-vindo à Floresta dos Sussurros." },
                    { speaker: "Guardião", text: "As árvores sussurram o caminho para quem sabe ouvir." },
                    { speaker: "Guardião", text: "Há um baú escondido ao noroeste. Cuidado com os sombrios." },
                ],
            },
            {
                name: "Espírito Perdido", x: 15, y: 10, color: "#aaaaff",
                dialogue: [
                    { speaker: "Espírito", text: "Você também está perdido?" },
                    { speaker: "Espírito", text: "Eu era um viajante, há muito tempo..." },
                    { speaker: "Espírito", text: "Dizem que ao sul há uma caverna de cristais. Os cristais guardam memórias." },
                ],
                questGiver: true, questId: "help_lost_spirit",
            },
        ],
        enemies: [
            { type: "slime", x: 6, y: 4, id: "ww_e1" },
            { type: "slime", x: 13, y: 7, id: "ww_e2" },
            { type: "shadow_wisp", x: 16, y: 5, id: "ww_e3" },
        ],
        exits: [
            { x: 0, y: 5, w: 1, h: 2, target: "forest_clearing", tx: 14, ty: 4 },
            { x: 7, y: 13, w: 4, h: 1, target: "crystal_grotto", tx: 6, ty: 1, requires: null },
            { x: 19, y: 5, w: 1, h: 2, target: "ruins_of_asterion", tx: 1, ty: 5 },
        ],
        ambientParticles: { color: "#3a6a3a", count: 20, speed: 5 },
    },

    crystal_grotto: {
        name: "Caverna dos Cristais",
        desc: "Cristais brilham com memórias antigas.",
        width: 16, height: 12,
        bg: "#080818",
        tileMap: [
            row(12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12),
            row(12, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,12),
            row(12, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,12),
            row(12, 8, 8,11, 8, 8, 8, 8, 8, 8,11, 8, 8, 8, 8,12),
            row(12, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,12),
            row(12, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,12),
            row(12, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,11, 8,12),
            row(12, 8,11, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,12),
            row(12, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,12),
            row(12, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,12),
            row(12, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,12),
            row(12,12,12,12,12, 0, 0,12,12,12,12,12,12,12,12,12),
        ],
        objects: [
            { type: "crystal", x: 5, y: 3, id: "cg_crystal1", color: "#ff66ff", label: "Cristal Rosa" },
            { type: "crystal", x: 10, y: 5, id: "cg_crystal2", color: "#66ffff", label: "Cristal Azul" },
            { type: "crystal", x: 7, y: 8, id: "cg_crystal3", color: "#ffff66", label: "Cristal Dourado" },
            { type: "chest", x: 13, y: 2, id: "cg_chest1", opened: false, contains: "mana_shard", label: "Baú Cristalino" },
            { type: "lever", x: 3, y: 6, id: "cg_lever1", activated: false },
            { type: "door", x: 12, y: 3, id: "cg_door1", locked: true, requires: "cg_lever1", label: "Portão de Pedra" },
            { type: "potion", x: 8, y: 10, id: "cg_potion1", color: "#4488ff", label: "Poção de Mana" },
        ],
        npcs: [
            {
                name: "Mercador Crystalino", x: 2, y: 9, color: "#ffaa44",
                dialogue: [
                    { speaker: "Mercador", text: "Ah, um visitante! Poucos ousam entrar na caverna." },
                    { speaker: "Mercador", text: "Os cristais aqui são vivos. Cada um guarda uma memória." },
                    { speaker: "Mercador", text: "Ative a alavanca ao oeste para abrir o portão." },
                    { speaker: "Mercador", text: "Atrás dele há algo valioso... e perigoso." },
                ],
            },
        ],
        enemies: [
            { type: "crystal_golem", x: 8, y: 4, id: "cg_e1" },
            { type: "crystal_golem", x: 4, y: 8, id: "cg_e2" },
        ],
        exits: [
            { x: 6, y: 0, w: 2, h: 1, target: "whispering_woods", tx: 7, ty: 12 },
            { x: 15, y: 5, w: 1, h: 2, target: "old_library", tx: 1, ty: 5 },
        ],
        ambientParticles: { color: "#aa66ff", count: 25, speed: 3 },
    },

    ruins_of_asterion: {
        name: "Ruínas de Asterion",
        desc: "Templos esquecidos guardam segredos ancestrais.",
        width: 18, height: 12,
        bg: "#1a1510",
        tileMap: [
            row(12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12),
            row(12, 2, 2, 2, 2, 2,15, 2, 2, 2, 2,15, 2, 2, 2, 2, 2,12),
            row(12, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,12),
            row(12, 2, 2,18, 2, 2, 2, 2, 2, 2, 2, 2, 2,18, 2, 2, 2,12),
            row(12, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,12),
            row( 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,12),
            row(12, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,12),
            row(12, 2, 2, 2, 2,15, 2, 2, 2, 2, 2,15, 2, 2, 2, 2, 2,12),
            row(12, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,12),
            row(12, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,12),
            row(12, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,12),
            row(12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12),
        ],
        objects: [
            { type: "monument", x: 8, y: 4, id: "ra_monument" },
            { type: "lever", x: 3, y: 8, id: "ra_lever1", activated: false },
            { type: "lever", x: 14, y: 8, id: "ra_lever2", activated: false },
            { type: "door", x: 8, y: 1, id: "ra_door", locked: true, requires: ["ra_lever1", "ra_lever2"], label: "Portão Interior" },
            { type: "chest", x: 8, y: 2, id: "ra_chest1", opened: false, contains: "memory_fragment", label: "Sarcófago Antigo" },
            { type: "torch", x: 5, y: 0, id: "ra_t1", lit: false },
            { type: "torch", x: 11, y: 0, id: "ra_t2", lit: false },
        ],
        npcs: [
            {
                name: "Fantasma do Sábio", x: 10, y: 3, color: "#ccaaff",
                dialogue: [
                    { speaker: "Sábio", text: "Estas ruínas foram um dia a biblioteca mais grandiosa do mundo." },
                    { speaker: "Sábio", text: "Agora só restam ecos... e guardiões." },
                    { speaker: "Sábio", text: "Ative as duas alavancas para abrir o portão interior." },
                    { speaker: "Sábio", text: "Cuidado: os guardiões de pedra não perdoam." },
                ],
            },
        ],
        enemies: [
            { type: "stone_guardian", x: 5, y: 5, id: "ra_e1" },
            { type: "stone_guardian", x: 12, y: 5, id: "ra_e2" },
            { type: "shadow_wisp", x: 8, y: 8, id: "ra_e3" },
        ],
        exits: [
            { x: 0, y: 5, w: 1, h: 2, target: "whispering_woods", tx: 18, ty: 5 },
            { x: 17, y: 5, w: 1, h: 2, target: "shadow_temple", tx: 1, ty: 5, requires_fragments: 3 },
        ],
        ambientParticles: { color: "#8a7a5a", count: 10, speed: 2 },
    },

    old_library: {
        name: "Biblioteca Ancestral",
        desc: "Conhecimento perdido aguarda os que buscam.",
        width: 16, height: 12,
        bg: "#12100d",
        tileMap: [
            row(12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12),
            row(12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,12),
            row(12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,12),
            row(12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,12),
            row(12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,12),
            row(12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,12),
            row(12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,12),
            row(12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,12),
            row(12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,12),
            row(12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,12),
            row(12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4,12),
            row(12,12,12,12,12,12,12,12,12,12,12,12,12,12,12,12),
        ],
        objects: [
            { type: "bookshelf", x: 1, y: 1, id: "ol_bs1" },
            { type: "bookshelf", x: 2, y: 1, id: "ol_bs2" },
            { type: "bookshelf", x: 3, y: 1, id: "ol_bs3" },
            { type: "bookshelf", x: 14, y: 1, id: "ol_bs4" },
            { type: "book", x: 7, y: 3, id: "ol_book1", title: "Crônicas do Arquimago", text: "O Arquimago foi o maior mago da era antiga. Seus poderes eram incomparáveis." },
            { type: "book", x: 10, y: 7, id: "ol_book2", title: "Sobre Fragmentos", text: "Os fragmentos de memória são cristalizados pela emoção. Apenas o toque pode restaurá-los." },
            { type: "crystal", x: 12, y: 2, id: "ol_crystal1", color: "#ffaa00", label: "Cristal Dourado" },
            { type: "chest", x: 13, y: 9, id: "ol_chest1", opened: false, contains: "spell_boost", label: "Baú da Biblioteca" },
            { type: "potion", x: 4, y: 8, id: "ol_potion1", color: "#ff4444", label: "Poção de Vida" },
        ],
        npcs: [
            {
                name: "Bibliotecário Fantasma", x: 8, y: 5, color: "#ffcc66",
                dialogue: [
                    { speaker: "Bibliotecário", text: "Shh! Silêncio na biblioteca!" },
                    { speaker: "Bibliotecário", text: "...desculpe. Há muito tempo não tenho visitantes." },
                    { speaker: "Bibliotecário", text: "Esta biblioteca contém todo o conhecimento da era antiga." },
                    { speaker: "Bibliotecário", text: "Os livros não se abrirão para quem não tem curiosidade." },
                    { speaker: "Bibliotecário", text: "Explore. Leia. Aprenda. Cada livro é uma porta." },
                ],
            },
        ],
        enemies: [
            { type: "shadow_wisp", x: 5, y: 5, id: "ol_e1" },
            { type: "shadow_wisp", x: 11, y: 3, id: "ol_e2" },
        ],
        exits: [
            { x: 0, y: 5, w: 1, h: 2, target: "crystal_grotto", tx: 14, ty: 5 },
            { x: 7, y: 11, w: 2, h: 1, target: "shadow_temple", tx: 8, ty: 1, requires_fragments: 3 },
        ],
        ambientParticles: { color: "#ccaa44", count: 12, speed: 2 },
    },

    shadow_temple: {
        name: "Templo das Sombras",
        desc: "O último desafio aguarda nas trevas.",
        width: 18, height: 14,
        bg: "#0a0510",
        tileMap: [
            row(17,17,17,17,17,17,17, 0, 0, 0, 0,17,17,17,17,17,17,17),
            row(17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17),
            row(17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17),
            row(17, 9, 9,17, 9, 9, 9, 9, 9, 9, 9, 9, 9,17, 9, 9, 9,17),
            row(17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17),
            row( 0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17),
            row(17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17),
            row(17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17),
            row(17, 9, 9,17, 9, 9, 9, 9, 9, 9, 9, 9, 9,17, 9, 9, 9,17),
            row(17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17),
            row(17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17),
            row(17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17),
            row(17, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,17),
            row(17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17,17),
        ],
        objects: [
            { type: "crystal", x: 9, y: 3, id: "st_crystal1", color: "#ff2222", label: "Cristal Sombrio" },
            { type: "crystal", x: 5, y: 10, id: "st_crystal2", color: "#ff2222", label: "Cristal Sombrio" },
            { type: "crystal", x: 13, y: 10, id: "st_crystal3", color: "#ff2222", label: "Cristal Sombrio" },
            { type: "monument", x: 9, y: 7, id: "st_monument" },
            { type: "torch", x: 2, y: 2, id: "st_t1", lit: false },
            { type: "torch", x: 15, y: 2, id: "st_t2", lit: false },
            { type: "torch", x: 2, y: 11, id: "st_t3", lit: false },
            { type: "torch", x: 15, y: 11, id: "st_t4", lit: false },
        ],
        npcs: [],
        enemies: [
            { type: "shadow_wraith", x: 9, y: 5, id: "st_boss", isBoss: true },
        ],
        exits: [
            { x: 0, y: 5, w: 1, h: 2, target: "ruins_of_asterion", tx: 16, ty: 5 },
        ],
        ambientParticles: { color: "#660066", count: 30, speed: 6 },
    },
};

export function getRoom(key) {
    return ROOMS[key] || null;
}

export function getRoomList() {
    return Object.keys(ROOMS).map(k => ({ key: k, name: ROOMS[k].name }));
}
