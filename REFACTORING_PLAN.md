# Plano: Refatoração do Sistema de Tiles — Aba História

## Contexto

O projeto "O Arquimago" utiliza um spritesheet (`forest_ground_tileset.png`) para renderizar tiles na aba História. O código em `AssetLoader.js:9` aponta para `assets/tiles/forest_ground_tileset.png`, mas este arquivo não existe nesse caminho (o real está em `assets/illustrations/Tiles/forest/forest_ground_tileset.png`). Na prática, o tileset nunca carrega e o jogo usa sempre o fallback procedural.

Já existem 18 PNGs individuais em `assets/tiles/` (grass.png, dirt.png, stone.png, etc.) que não são utilizados por nenhum código.

**Objetivo:** Substituir a dependência do spritesheet por carregamento direto dos PNGs individuais, isolando toda mudança na aba História.

---

## Arquivos Envolvidos

### Arquivos ES Modules (exclusivos da aba História — importados apenas por `history.js`):
| Arquivo | Papel | Ação |
|---------|-------|------|
| `js/engine/HistoryTileLoader.js` | **NOVO** — Loader de tiles individuais | **CRIAR** |
| `js/engine/renderer.js` | Renderizador principal do jogo | **MODIFICAR** |
| `js/engine/AssetLoader.js` | Loader atual (spritesheet) | NÃO alterar (continua usado por player.js para sprites de personagem) |
| `js/engine/AssetProcessor.js` | Processador de assets | NÃO alterar |
| `js/engine/MapManager.js` | Validação e mapeamento de tiles | NÃO alterar |
| `js/engine/world.js` | Constantes de tiles e mapas | NÃO alterar |
| `js/engine/player.js` | Player (usa AssetLoader para sprites de personagem) | NÃO alterar |

### Arquivos compartilhados com outras abas:
**NENHUM será modificado** (config.js, storage.js, navigation.js, ui.js, app.js, etc.)

---

## Passo 1 — Criar `js/engine/HistoryTileLoader.js`

Novo módulo que carrega PNGs individuais em vez do spritesheet.

```javascript
/**
 * HistoryTileLoader.js
 * Loads individual tile PNGs for the History tab.
 * Replaces spritesheet-based tile loading.
 */

const TILE_SIZE = 32;

// Maps tile ID → individual PNG path
const TILE_PNG_MAP = {
    0:  "assets/tiles/grass.png",
    1:  "assets/tiles/dirt.png",
    2:  "assets/tiles/stone.png",
    3:  "assets/tiles/sand.png",
    4:  "assets/tiles/wood_floor.png",
    5:  null,  // CRYSTAL_FLOOR — no PNG, procedural only
    6:  null,  // WATER — no PNG, procedural only
    7:  "assets/tiles/bridge.png",
    8:  "assets/tiles/dark_stone.png",
    9:  "assets/tiles/temple_floor.png",
    10: "assets/tiles/tree.png",
    11: "assets/tiles/rock.png",
    12: "assets/tiles/wall.png",
    13: "assets/tiles/bush.png",
    14: "assets/tiles/bookshelf.png",
    15: "assets/tiles/pillar.png",
    16: "assets/tiles/fence.png",
    17: "assets/tiles/dark_wall.png",
    18: "assets/tiles/ruin.png",
    19: "assets/tiles/tall_grass.png",
};

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to load: " + src));
        img.src = src;
    });
}

function generateGrassFallback(tw, th) {
    // Same as existing in AssetLoader.js
    const c = document.createElement("canvas");
    c.width = tw; c.height = th;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#1a3a1a";
    ctx.fillRect(0, 0, tw, th);
    ctx.fillStyle = "rgba(30, 80, 30, 0.3)";
    ctx.fillRect(4, 6, 1, 4);
    ctx.fillRect(14, 12, 1, 4);
    ctx.fillRect(22, 8, 1, 4);
    return c;
}

export function createHistoryTileLoader() {
    const tileImages = {};       // tileId → HTMLImageElement
    let grassFallback = null;
    let loaded = false;
    let loading = false;
    let readyPromise = null;

    function getTileSize() { return TILE_SIZE; }
    function isReady() { return loaded; }
    function isTilesetReady() { return loaded; }

    function getTileImage(tileId) {
        return tileImages[tileId] || null;
    }

    function getGrassFallback() {
        if (!grassFallback) grassFallback = generateGrassFallback(TILE_SIZE, TILE_SIZE);
        return grassFallback;
    }

    async function load() {
        if (loaded) return true;
        if (loading) return readyPromise;

        loading = true;
        readyPromise = (async () => {
            const entries = Object.entries(TILE_PNG_MAP);
            const results = await Promise.allSettled(
                entries.map(([id, path]) => {
                    if (!path) return Promise.resolve(null);
                    return loadImage(path);
                })
            );

            let loadedCount = 0;
            entries.forEach(([id], i) => {
                const r = results[i];
                if (r.status === "fulfilled" && r.value) {
                    tileImages[Number(id)] = r.value;
                    loadedCount++;
                }
            });

            console.log("[HistoryTileLoader] Tiles loaded:", loadedCount, "/ 18 individual PNGs");
            loaded = true;
            loading = false;
            return true;
        })();

        return readyPromise;
    }

    function destroy() {
        for (const k of Object.keys(tileImages)) delete tileImages[k];
        grassFallback = null;
        loaded = false;
        loading = false;
        readyPromise = null;
    }

    return {
        load, destroy, isReady, isTilesetReady,
        getTileImage, getGrassFallback, getTileSize,
    };
}
```

**Interface exposta (compatível com o que o renderer precisa):**
- `load()` → Promise<boolean>
- `isReady()` → boolean
- `getTileImage(tileId)` → HTMLImageElement | null
- `getTileSize()` → 32
- `getGrassFallback()` → HTMLCanvasElement
- `destroy()` → void

---

## Passo 2 — Modificar `js/engine/renderer.js`

### 2a. Import (linha 2)

**ANTES:**
```javascript
import { createAssetLoader } from "./AssetLoader.js";
```

**DEPOIS:**
```javascript
import { createHistoryTileLoader } from "./HistoryTileLoader.js";
```

### 2b. Criação do loader (linha 194)

**ANTES:**
```javascript
const assetLoader = createAssetLoader();
```

**DEPOIS:**
```javascript
const tileLoader = createHistoryTileLoader();
```

### 2c. `ensureAssets()` (linhas 202-211)

**ANTES:**
```javascript
loadPromise = assetLoader.load().then(() => { assetsReady = true; })
```

**DEPOIS:**
```javascript
loadPromise = tileLoader.load().then(() => { assetsReady = true; })
```

### 2d. `drawRoom()` — o coração da mudança (linhas 254-288)

**ANTES:**
```javascript
function drawRoom(room, camX, camY, time) {
    if (!room || !room.tileMap) return;
    const tw = assetLoader.getTileSize();
    const th = tw;
    const tilesetCols = assetLoader.getTilesetCols();
    const tilesetRows = assetLoader.getTilesetRows();
    const tilesetImg = assetLoader.getTilesetImage();
    const camIX = Math.floor(camX);
    const camIY = Math.floor(camY);

    const { startTX, startTY, endTX, endTY } = mapManager.getVisibleTiles(
        camIX, camIY, width, height, room.width, room.height, tw
    );

    for (let ty = startTY; ty <= endTY; ty++) {
        for (let tx = startTX; tx <= endTX; tx++) {
            if (ty < 0 || ty >= room.height || tx < 0 || tx >= room.width) continue;
            const rawTile = room.tileMap[ty][tx];
            const tile = mapManager.validateTileId(rawTile, tilesetCols, tilesetRows);
            const sx = tx * tw - camIX;
            const sy = ty * th - camIY;
            const pos = mapManager.getTilePosition(tile, tilesetCols, tilesetRows);
            const canTileset = assetsReady && assetLoader.isTilesetReady() && tilesetImg && pos !== null;

            if (canTileset) {
                const srcSX = pos.col * tw;
                const srcSY = pos.row * th;
                if (srcSX + tw <= tilesetImg.naturalWidth && srcSY + th <= tilesetImg.naturalHeight) {
                    ctx.drawImage(tilesetImg, srcSX, srcSY, tw, th, Math.floor(sx), Math.floor(sy), tw, th);
                    continue;
                }
            }
            drawProceduralTile(ctx, tile, Math.floor(sx), Math.floor(sy), tw, th, tx, ty, time);
        }
    }
}
```

**DEPOIS:**
```javascript
function drawRoom(room, camX, camY, time) {
    if (!room || !room.tileMap) return;
    const tw = tileLoader.getTileSize();
    const th = tw;
    const camIX = Math.floor(camX);
    const camIY = Math.floor(camY);

    const { startTX, startTY, endTX, endTY } = mapManager.getVisibleTiles(
        camIX, camIY, width, height, room.width, room.height, tw
    );

    for (let ty = startTY; ty <= endTY; ty++) {
        for (let tx = startTX; tx <= endTX; tx++) {
            if (ty < 0 || ty >= room.height || tx < 0 || tx >= room.width) continue;
            const rawTile = room.tileMap[ty][tx];
            const tile = mapManager.validateTileId(rawTile, 999, 999);
            const sx = tx * tw - camIX;
            const sy = ty * th - camIY;
            const tileImg = assetsReady ? tileLoader.getTileImage(tile) : null;

            if (tileImg) {
                ctx.drawImage(tileImg, Math.floor(sx), Math.floor(sy), tw, th);
                continue;
            }
            drawProceduralTile(ctx, tile, Math.floor(sx), Math.floor(sy), tw, th, tx, ty, time);
        }
    }
}
```

**Mudanças-chave:**
- Não precisa mais de `tilesetCols`, `tilesetRows`, `tilesetImg`
- Não precisa mais de `mapManager.getTilePosition()`
- `mapManager.validateTileId()` continua sendo chamado (para validação de range), mas com valores grands para cols/rows (já que não dependemos mais do grid do spritesheet)
- Se `tileLoader.getTileImage(tile)` retornar uma imagem, desenha ela diretamente
- Se não, cai no fallback procedural (água, cristal, ou qualquer PNG que falhou)

### 2e. Funções que referenciam `assetLoader`

As seguintes funções também precisam ser atualizadas:

**`drawObject()` (linha 292):** `const tw = assetLoader.getTileSize();` → `const tw = tileLoader.getTileSize();`

**`drawNPC()` (linha 559):** `const tw = assetLoader.getTileSize();` → `const tw = tileLoader.getTileSize();`

### 2f. Return object (linha 685-689)

**ANTES:**
```javascript
return {
    ctx, clear, drawRoom, drawObject, drawNPC, drawHUD,
    drawTransition, drawMinimap, width, height,
    ensureAssets, assetLoader, mapManager,
};
```

**DEPOIS:**
```javascript
return {
    ctx, clear, drawRoom, drawObject, drawNPC, drawHUD,
    drawTransition, drawMinimap, width, height,
    ensureAssets, tileLoader, mapManager,
};
```

---

## O que NÃO muda

- **`MapManager.js`**: Não é alterado. `validateTileId()` e `getVisibleTiles()` continuam sendo usados. `getTilePosition()` e `TILESET_POSITIONS` permanecem no código mas não são mais chamados pelo renderer.
- **`world.js`**: Não é alterado. Todos os tiles, rooms, e constantes permanecem idênticos.
- **`AssetLoader.js`**: Não é alterado. Continua sendo usado pelo `player.js` para carregar sprites de personagem.
- **`AssetProcessor.js`**: Não é alterado.
- **`player.js`**: Não é alterado. Usa seu próprio `createAssetLoader()` apenas para sprites de personagem.
- **`history.js`**: Não é alterado.
- **Mapas**: Todos os tileMaps permanecem 100% idênticos.
- **Colisões**: `SOLID_TILES` e `isSolid()` não são alterados.
- **Câmera**: Cálculos de viewport não são alterados.
- **Animações**: Nenhuma alteração.
- **Outras abas**: Nenhuma alteração em home, dashboard, perfil, configurações, estudos, gamificação, login, navegação.

---

## Validação

Após implementação, verificar:
1. `grep -r "forest_ground_tileset" js/` — não deve retornar resultados no renderer
2. `grep -r "createAssetLoader" js/engine/renderer.js` — não deve existir
3. Os 18 PNGs em `assets/tiles/` são carregados
4. Tiles CRYSTAL_FLOOR e WATER continuam sendo desenhados proceduralmente
5. Todos os outros arquivos do projeto permanecem inalterados
6. Nenhum arquivo compartilhado com outras abas foi modificado
