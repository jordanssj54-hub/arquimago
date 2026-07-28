(function (global) {
    "use strict";

    var Arquimago = global.Arquimago || {};

    Arquimago.Narrative = {};

    Arquimago.Narrative.UNIVERSE = {
        name: "Etheria",
        description: "Um mundo onde a magia não é um poder que se empunha, mas uma frequência que se sintoniza. Cada ser vivo emite um tom único no tecido da realidade. Os magos são aqueles que aprendem a ouvir e harmonizar esses tons, moldando o mundo ao seu redor através da vontade e da disciplina.",
        concepts: {
            primordialSong: "O Canto Primordial é a vibração fundamental da criação. Toda magia deriva desta melodia eterna que sustenta a realidade. Os magos mais poderosos não lançam feitiços — eles regem sinfonias.",
            theVeil: "O Véu é a membrana entre o mundo físico e o reino mágico. Com o abandono do Arquimago, o Véu tornou-se frágil em muitos lugares, permitindo que criaturas corrompidas atravessassem.",
            theEcho: "O Eco é a ressonância mágica deixada por eventos poderosos. Lugares marcados por grande magia ou grande tragédia preservam memórias no tecido da realidade. A Floresta dos Ecos é o maior exemplo vivo deste fenômeno.",
            theHollow: "O Vazio é a ausência de propósito manifestada. Não é um deus nem um demônio — é o que resta quando alguém abandona aquilo que poderia se tornar. Quanto mais pessoas desistem de seus caminhos, mais forte o Vazio se torna."
        }
    };

    Arquimago.Narrative.MAGIC_ORIGIN = {
        title: "A Origem da Magia",
        text: "No princípio, o silêncio cantou. Diz a lenda que o universo nasceu de uma única nota sustentada por toda a eternidade. Dessa nota surgiram harmonias, e das harmonias, a consciência. Os primeiros magos não inventaram a magia — eles simplesmente se lembraram de como ouvi-la.\n\nA magia flui em três correntes:\n- A Corrente da Vontade: magia moldada pela determinação do mago.\n- A Corrente da Sabedoria: magia que flui do conhecimento e da compreensão.\n- A Corrente do Sacrifício: magia que exige algo em troca.\n\nO Arquimago, em seu auge, dominava as três correntes em perfeito equilíbrio."
    };

    Arquimago.Narrative.PROTAGONIST = {
        name: "O Arquimago",
        trueName: "Aurelian",
        title: "O Recomeço",
        formerTitle: "O Regente das Harmônicas",
        description: "Um dia o mago mais poderoso de sua era. Aurelian dominou as três correntes da magia, construiu a Torre de Cristal nas Montanhas Cinzentas, e foi conselheiro de três reinos. Mas sua grandeza carregava uma sombra: o medo de que seu poder não fosse suficiente.\n\nQuando a crise final chegou — a primeira Brecha do Vazio — Aurelian hesitou. Em seu momento de maior necessidade, a dúvida o paralisou. A Brecha se expandiu. Milhares morreram. Ele abandonou sua torre, quebrou seu cajado, e desapareceu.\n\nAgora, após anos de exílio voluntário, algo o trouxe de volta. Não a redenção. Não a vingança. Mas uma verdade simples: ele nunca terminou o que começou.",
        appearance: "Um homem de porte alto, mas curvado pelo peso dos anos e da culpa. Suas vestes, antes azuis e douradas, agora são cinzas e puídas. Olhos azuis que brilham com a pouca magia que lhe resta. Barba desgrenhada. Mãos que tremem ao segurar seu cajado quebrado.",
        theme: "recomeco",
        quote: "A culpa destruiu quem você era. Agora ela alimenta quem você escolheu se tornar."
    };

    Arquimago.Narrative.ANTAGONIST = {
        name: "O Rei do Vazio",
        trueName: "Desconhecido (alguns sussurram que é um reflexo do próprio Arquimago)",
        description: "O Rei do Vazio não é um ser malígno no sentido tradicional. Ele é a personificação de todo potencial abandonado, de todo caminho não trilhado, de toda desistência. Sua aparência é fluida, mudando conforme observador, mas sempre preservando uma forma humanoide envolta em escuridão pulsante.\n\nDizem que ele foi o primeiro mago a desistir. Ou talvez seja o que todos os magos podem se tornar se abandonarem seu propósito. Sua voz soa como eco de múltiplas vozes simultâneas, e seu toque apaga memórias.\n\nO Rei do Vazio não quer destruir o mundo. Ele quer que todos desistam como ele desistiu. Pois um universo de desistências é um universo onde o Vazio é tudo que resta.",
        appearance: "Uma silhueta alta e esguia, feita de escuridão que absorve a luz ao seu redor. Orbes vermelhos onde deveriam estar os olhos. Uma coroa de fragmentos de cristal negro flutuando sobre sua cabeça. Sua presença faz o ar esfriar e as cores ao redor perderem a vivacidade.",
        abilities: [
            "Toque do Esquecimento: apaga memórias de quem toca",
            "Manto da Desistência: envolve inimigos em apatia profunda",
            "Grito do Vazio: libera uma onda de energia que suprime magia",
            "Fragmentação: divide-se em múltiplas sombras"
        ]
    };

    Arquimago.Narrative.BESTIARY = [
        {
            id: "lobo_sombrio",
            name: "Lobo Sombrio",
            type: "Corrompido",
            description: "Lobos comuns deformados pela exposição prolongada ao Vazio. Seus olhos brilham em vermelho, suas peles tornam-se negras como carvão, e seus dentes crescem desordenadamente. Caçam em alcateias de 3 a 5 indivíduos.",
            danger: "Médio",
            habitats: ["Floresta dos Ecos", "Montanhas Cinzentas"]
        },
        {
            id: "esqueleto_errante",
            name: "Esqueleto Errante",
            type: "Morto-vivo",
            description: "Remanescentes de guerreiros que morreram em batalhas esquecidas. O Vazio anima seus ossos com um propósito distorcido. Empunham armas enferrujadas e movem-se com um rangido seco e sinistro.",
            danger: "Baixo",
            habitats: ["Ruínas de Asterion", "Floresta dos Ecos"]
        },
        {
            id: "sombra",
            name: "Sombra Rastejante",
            type: "Vazio",
            description: "Fragmentos do Vazio que ganharam forma própria. Não possuem corpo sólido, deslizando pelo chão como manchas de escuridão. Atacam absorvendo a energia vital de suas vítimas. Imunes a ataques físicos comuns.",
            danger: "Alto",
            habitats: ["Qualquer área com Véu enfraquecido"]
        },
        {
            id: "cristal_corrompido",
            name: "Cristal Corrompido",
            type: "Corrompido",
            description: "Cristais mágicos que foram infectados pelo Vazio. Emitem uma luz púrpura doentia e pulsante. Podem disparar feixes de energia corrompida ou explodir em estilhaços venenosos.",
            danger: "Médio",
            habitats: ["Ruínas de Asterion", "Cavernas"]
        },
        {
            id: "espectro",
            name: "Espectro Lamentante",
            type: "Espiritual",
            description: "As almas de magos que também abandonaram seus caminhos, presas entre o mundo físico e o Vazio. Aparecem como figuras translúcidas que repetem seus fracassos em sussurros. Drenam a vontade de viver de quem os enfrenta.",
            danger: "Alto",
            habitats: ["Ruínas de Asterion", "Torre Abandonada"]
        },
        {
            id: "golem_ruina",
            name: "Golem de Ruínas",
            type: "Constructo",
            description: "Antigos guardiões de pedra que protegiam templos e bibliotecas arcanas. Com o abandono do Arquimago e o enfraquecimento do Véu, muitos perderam seus programas originais e agora atacam qualquer intruso indiscriminadamente.",
            danger: "Muito Alto",
            habitats: ["Ruínas de Asterion", "Castelo do Eclipse"]
        },
        {
            id: "corvo_observador",
            name: "Corvo Observador",
            type: "Animais",
            description: "Corvos comuns, mas com uma inteligência anormal. Servem como espiões para o Rei do Vazio. Seus olhos brilham em vermelho quando estão sendo controlados. Não atacam diretamente, mas sua presença indica que o Vazio sabe onde você está.",
            danger: "Baixo (informativo)",
            habitats: ["Todas as regiões"]
        }
    ];

    Arquimago.Narrative.FACTIONS = [
        {
            id: "ordem_lotus",
            name: "Ordem do Lótus",
            type: "Guardiões do Conhecimento",
            description: "Uma ordem secreta de magos que preserva os ensinamentos antigos. Acreditam que a magia deve ser protegida, não usada. Após a queda do Arquimago, esconderam-se nas bibliotecas subterrâneas de Asterion. São os únicos que ainda possuem registros completos das três correntes.",
            alignment: "Neutro-Bom",
            leader: "Mestra Liana",
            base: "Biblioteca Oculta, Ruínas de Asterion"
        },
        {
            id: "sem_chama",
            name: "Os Sem Chama",
            type: "Bandidos",
            description: "Magos que perderam seus poderes e agora sobrevivem como saqueadores. Culpam o Arquimago por sua queda. São antagonistas nos primeiros capítulos, mas alguns podem ser convencidos a mudar de lado.",
            alignment: "Caótico-Neutro",
            leader: "Kael, o Sem Chama",
            base: "Acampamento na Floresta dos Ecos"
        },
        {
            id: "guardioes_eco",
            name: "Guardiões do Eco",
            type: "Protetores",
            description: "Seres místicos que protegem os locais onde o Eco é mais forte. Não são exatamente humanos — alguns são espíritos da natureza, outros são magos que se fundiram com a magia local. Não interferem nos assuntos dos mortais, a menos que o Eco seja ameaçado.",
            alignment: "Neutro Absoluto",
            leader: "Velho Beldor",
            base: "Coração da Floresta dos Ecos"
        },
        {
            id: "culto_vazio",
            name: "Culto do Vazio",
            type: "Seita",
            description: "Fanáticos que acreditam que o Vazio é a verdadeira natureza da realidade. Buscam acelerar o colapso do Véu para que tudo retorne ao silêncio primordial. São liderados por seres que já foram humanos, mas agora são meros receptáculos do Vazio.",
            alignment: "Malígno",
            leader: "Alto Clérigo Obscuro",
            base: "Catacumbas do Castelo do Eclipse"
        },
        {
            id: "reino_seraphine",
            name: "Remanescentes de Lumina",
            type: "Refugiados",
            description: "Sobreviventes do Reino de Lumina, que foi a primeira grande vítima da Brecha do Vazio. Liderados pela Princesa Seraphine, buscam restaurar seu reino. São aliados valiosos que oferecem suprimentos e informação em troca de proteção.",
            alignment: "Leal-Bom",
            leader: "Princesa Seraphine",
            base: "Acampamento Lumina, Planícies Centrais"
        }
    ];

    Arquimago.Narrative.NPCS = [
        {
            id: "mestra_liana",
            name: "Mestra Liana",
            role: "Mentora",
            description: "A última arquivista da Ordem do Lótus. Uma mulher idosa de cabelos prateados e olhos que parecem enxergar através de mentiras. Conheceu Aurelian antes de sua queda. É a primeira pessoa a oferecer ajuda ao Arquimago em seu retorno.",
            location: "Biblioteca Oculta, Ruínas de Asterion",
            quotes: [
                "Você não está aqui por acaso, Aurelian. O Eco chamou você de volta.",
                "O Vazio não é seu inimigo. Seu verdadeiro inimigo é a certeza de que não pode mais tentar.",
                "As três correntes ainda fluem em você. Precisa apenas aprender a ouvi-las novamente."
            ]
        },
        {
            id: "kael",
            name: "Kael",
            role: "Antagonista Recuperável",
            description: "Um mago de meia-idade que perdeu seus poderes na Brecha. Culpa o Arquimago por tudo. Lidera os Sem Chama com carisma e raiva. Sob sua armadura áspera, guarda um profundo desejo de também recomeçar.",
            location: "Acampamento Sem Chama, Floresta dos Ecos",
            quotes: [
                "Você nos abandonou! Todos nós acreditamos em você!",
                "Olhe para nós. Olhe o que sobrou da sua grandeza.",
                "Ensine-me. Não quero mais ser um Sem Chama."
            ]
        },
        {
            id: "velho_beldor",
            name: "Velho Beldor",
            role: "Guardião Místico",
            description: "Ninguém sabe quantos anos Beldor tem. Ele guarda o Coração da Floresta dos Ecos há tanto tempo que a floresta passou a fazer parte dele. Seu corpo é coberto por musgo brilhante e pequenos cristais. Fala em enigmas e só responde a quem prova ser digno.",
            location: "Coração da Floresta dos Ecos",
            quotes: [
                "A floresta se lembra de você, Aurelian. Ela sente sua falta.",
                "O primeiro passo para reconstruir é aceitar que as ruínas são lindas.",
                "Não tente recuperar o que foi. Torne-se o que poderia ter sido."
            ]
        },
        {
            id: "princesa_seraphine",
            name: "Princesa Seraphine",
            role: "Aliada Política",
            description: "Última herdeira do trono de Lumina. Uma jovem mulher que carrega o peso de seu povo com uma maturidade forçada pelas circunstâncias. Não possui habilidades mágicas, mas sua determinação é tão forte quanto qualquer feitiço.",
            location: "Acampamento Lumina",
            quotes: [
                "Meu pai acreditava em você. Eu quero acreditar também.",
                "Lumina não caiu por causa do Vazio. Caiu porque estávamos sozinhos.",
                "Quando você estiver pronto para lutar, estaremos prontos para reconstruir."
            ]
        },
        {
            id: "ferreiro_runas",
            name: "O Ferreiro de Runas",
            role: "Artesão Místico",
            description: "Uma figura encapuzada que vive nas Montanhas Cinzentas. Forja armas e ferramentas com runas antigas. Nunca revela seu rosto, e sua voz ecoa como se viesse de muito longe. Sabe mais sobre o destino do Arquimago do que revela.",
            location: "Forja Oculta, Montanhas Cinzentas",
            quotes: [
                "Seu cajado não está quebrado. Ele apenas espera que você se lembre de como consertá-lo.",
                "Uma ferramenta não define o artesão. Mas um artesão sem ferramentas é apenas uma ideia.",
                "O fogo que forja o aço mais forte é aquele que queima dentro de você."
            ]
        }
    ];

    Arquimago.Narrative.REGIONS = [
        {
            id: "vale_recomeco",
            name: "Vale do Recomeço",
            description: "Onde a jornada começa. Um vale pacífico mas marcado por cicatrizes antigas da Brecha do Vazio. Gramíneas douradas, ruínas de pequenas vilas abandonadas, e um céu que alterna entre o azul e o crepúsculo eterno. Aqui o Arquimago acorda para seu novo propósito.",
            danger: "Baixo",
            features: ["Ruínas da Vila de Pedra", "Lago dos Reflexos", "Árvore dos Começos"],
            connections: ["Floresta dos Ecos"]
        },
        {
            id: "floresta_ecos",
            name: "Floresta dos Ecos",
            description: "Uma floresta antiga onde o tempo se move de forma diferente. Árvores enormes com folhas que brilham suavemente à noite. O ar é denso com magia residual, criando miragens e ecos de eventos passados. É aqui que o Véu é mais frágil em toda Etheria.",
            danger: "Médio",
            features: ["Clareira dos Sussurros", "Templo Submerso", "Coração da Floresta"],
            connections: ["Vale do Recomeço", "Ruínas de Asterion"]
        },
        {
            id: "ruinas_asterion",
            name: "Ruínas de Asterion",
            description: "A cidade dos magos. Um dia foi o centro do conhecimento arcano em Etheria. Agora é um labirinto de torres quebradas, bibliotecas em chamas eternas, e ruas cobertas por cristais mágicos crescendo sem controle. O Eco aqui é tão forte que às vezes o passado e o presente se sobrepõem.",
            danger: "Alto",
            features: ["Grande Biblioteca", "Torre dos Regentes", "Mercado de Cristais", "Portal das Correntes"],
            connections: ["Floresta dos Ecos", "Montanhas Cinzentas"]
        },
        {
            id: "montanhas_cinzentas",
            name: "Montanhas Cinzentas",
            description: "Uma cordilheira imponente que separa as terras conhecidas do Castelo do Eclipse. Suas encostas são varridas por ventos gelados, e suas cavernas abrigam criaturas ancestrais. Dizem que a Forja Oculta do Ferreiro de Runas está em algum lugar aqui.",
            danger: "Alto",
            features: ["Pico do Vento Eterno", "Cavernas Cristalinas", "Forja Oculta", "Passagem do Eco"],
            connections: ["Ruínas de Asterion", "Castelo do Eclipse"]
        },
        {
            id: "castelo_eclipse",
            name: "Castelo do Eclipse",
            description: "A fortaleza do Rei do Vazio. Um castelo que não segue as leis da física — suas torres se estendem para dentro de si mesmas, e seus corredores mudam de posição. O céu acima do castelo está permanentemente em eclipse. A própria arquitetura parece viva e hostil.",
            danger: "Extremo",
            features: ["Salão dos Ecos Quebrados", "Torre do Silêncio", "Trono do Vazio", "Núcleo da Brecha"],
            connections: ["Montanhas Cinzentas"]
        }
    ];

    Arquimago.Narrative.CHAPTERS = [
        {
            id: 1,
            name: "O Despertar",
            subtitle: "Das cinzas ao primeiro passo",
            description: "O Arquimago desperta no Vale do Recomeço. Sem poderes, sem memórias completas, sem direção. O Eco o guia até uma antiga aliada — Mestra Liana — que revela a verdade sobre a Brecha do Vazio e o papel que ele precisa desempenhar. O primeiro inimigo não é externo: é a própria dúvida.",
            region: "Vale do Recomeço",
            enemies: ["Lobo Sombrio", "Esqueleto Errante"],
            allies: ["Mestra Liana"],
            mechanics: ["Introdução ao sistema de missões", "Primeiras recompensas", "Tutorial de combate"],
            objectives: ["Despertar no Vale", "Encontrar Mestra Liana", "Realizar o primeiro exercício de disciplina", "Derrotar a primeira alcateia de Lobos Sombrios"],
            majorEvent: "O Primeiro Passo — O Arquimago completa seu primeiro hábito e sente um fragmento de poder retornar."
        },
        {
            id: 2,
            name: "A Floresta dos Ecos",
            subtitle: "Onde o passado nunca morre",
            description: "Atravessando a Floresta dos Ecos, o Arquimago enfrenta as consequências de seu abandono. Cada eco na floresta mostra um momento em que ele poderia ter agido e não agiu. Ele deve confrontar Kael e os Sem Chama, e provar que o recomeço é possível.",
            region: "Floresta dos Ecos",
            enemies: ["Lobo Sombrio", "Sombra Rastejante", "Espectro Lamentante", "Kael (chefe)"],
            allies: ["Velho Beldor", "Sem Chama (recrutáveis)"],
            mechanics: ["Escolhas narrativas com consequências", "Sistema de aliados temporários", "Exploração com ecos do passado"],
            objectives: ["Atravessar a Floresta", "Confrontar Kael", "Decidir o destino dos Sem Chama", "Encontrar o Coração da Floresta"],
            majorEvent: "O Perdão de Kael — Dependendo da escolha do jogador, Kael pode se tornar aliado ou cair ao Vazio."
        },
        {
            id: 3,
            name: "Ruínas de Asterion",
            subtitle: "O conhecimento tem seu preço",
            description: "Nas Ruínas de Asterion, o Arquimago busca na Grande Biblioteca os segredos para selar a Brecha do Vazio. Mas as ruínas estão infestadas de corrupção, e cada livro, cada cristal, cada sala guarda um perigo. Mestra Liana revela que a chave para tudo está na última corrente da magia — o Sacrifício.",
            region: "Ruínas de Asterion",
            enemies: ["Golem de Ruínas", "Cristal Corrompido", "Espectro Lamentante"],
            allies: ["Mestra Liana", "Princesa Seraphine (encontro)"],
            mechanics: ["Sistema de conhecimento/descobertas", "Quebra-cabeças ambientais", "Magias recuperadas como recompensa"],
            objectives: ["Entrar nas Ruínas", "Encontrar a Grande Biblioteca", "Descobrir o segredo da Corrente do Sacrifício", "Sobreviver ao encontro com o Eco de Aurelian"],
            majorEvent: "O Espelho do Passado — O Arquimago enfrenta uma manifestação de seu eu passado, um teste de quanto ele mudou."
        },
        {
            id: 4,
            name: "Montanhas Cinzentas",
            subtitle: "O fogo que forja",
            description: "Para enfrentar o Rei do Vazio, o Arquimago precisa de um novo cajado — forjado com uma runa capaz de canalizar as três correntes simultaneamente. A jornada às Montanhas Cinzentas é a mais perigosa até agora: criaturas ancestrais, tempestades mágicas, e o encontro com o enigmático Ferreiro de Runas.",
            region: "Montanhas Cinzentas",
            enemies: ["Lobo Sombrio (variante da neve)", "Sombra Rastejante", "Guardiões Ancestrais"],
            allies: ["Ferreiro de Runas", "Kael (se recrutado)"],
            mechanics: ["Sistema de clima/tempestades", "Forja de equipamentos", "Escalada e travessia"],
            objectives: ["Atravessar as Montanhas", "Encontrar a Forja Oculta", "Forjar o novo Cajado do Arquimago", "Sobreviver à revelação do Ferreiro de Runas"],
            majorEvent: "A Revelação — O Ferreiro de Runas revela que ele é um eco do próprio Arquimago de uma linha temporal onde ele nunca desistiu."
        },
        {
            id: 5,
            name: "Castelo do Eclipse",
            subtitle: "O fim do recomeço",
            description: "O confronto final. O Castelo do Eclipse é um pesadelo vivo, e cada sala testa não as habilidades do Arquimago, mas sua determinação. O Rei do Vazio não quer matá-lo — quer fazê-lo desistir novamente. A batalha final não é de poder contra poder, mas de vontade contra vazio. O Arquimago finalmente entende: o verdadeiro inimigo nunca foi o mundo. Foi abandonar quem ele poderia se tornar.",
            region: "Castelo do Eclipse",
            enemies: ["Todas as criaturas anteriores", "Culto do Vazio", "Rei do Vazio (chefe final)"],
            allies: ["Todos os aliados sobreviventes"],
            mechanics: ["Labirinto vivo", "Testes de determinação", "Batalha final em múltiplas fases"],
            objectives: ["Penetrar no Castelo", "Superar os testes do Vazio", "Confrontar o Rei do Vazio", "Fechar a Brecha para sempre"],
            majorEvent: "O Último Sacrifício — Para fechar a Brecha, o Arquimago deve sacrificar ou seu poder recém-recuperado ou sua memória do caminho percorrido. A escolha define o final."
        }
    ];

    Arquimago.Narrative.EVENTS = [
        {
            id: "queda_arquimago",
            name: "A Queda",
            type: "Passado",
            description: "Há 7 anos, a primeira Brecha do Vazio abriu-se nos arredores de Lumina. O Arquimago foi convocado, mas hesitou. Sua dúvida permitiu que a Brecha se expandisse, engolindo metade do reino. Ele quebrou seu cajado, abandonou sua torre, e desapareceu.",
            impact: "Mudou a percepção de Etheria sobre seu maior protetor. De herói a vilão em um só dia."
        },
        {
            id: "despertar",
            name: "O Despertar",
            type: "Presente",
            description: "O Arquimago acorda no Vale do Recomeço sem saber como chegou lá. O Eco o trouxe de volta. Algo mudou no mundo — a Brecha está se expandindo novamente, e ele é o único que já a enfrentou antes.",
            impact: "Início da jornada do jogador."
        },
        {
            id: "encontro_kael",
            name: "O Confronto na Floresta",
            type: "Capítulo 2",
            description: "Kael, líder dos Sem Chama, enfrenta o Arquimago. O confronto não é apenas físico — é um espelho do que o Arquimago poderia ter se tornado se tivesse deixado a culpa consumi-lo completamente.",
            impact: "Define a relação do Arquimago com aqueles que ele abandonou."
        },
        {
            id: "revelacao_ferreiro",
            name: "A Revelação na Forja",
            type: "Capítulo 4",
            description: "O Ferreiro de Runas revela sua verdadeira natureza: ele é o Arquimago de uma realidade onde a Brecha nunca aconteceu. Sua existência prova que o destino não é fixo — e que a escolha é sempre o que define o caminho.",
            impact: "Mudança fundamental na compreensão do protagonista sobre livre-arbítrio e destino."
        },
        {
            id: "batalha_final",
            name: "O Último Sacrifício",
            type: "Capítulo 5",
            description: "O confronto com o Rei do Vazio. A batalha final não é vencida com poder, mas com a recusa em desistir. O Arquimago prova que o recomeço é mais poderoso que a queda.",
            impact: "Define o final da jornada e o legado do Arquimago."
        }
    ];

    global.Arquimago = Arquimago;
})(typeof window !== "undefined" ? window : this);
