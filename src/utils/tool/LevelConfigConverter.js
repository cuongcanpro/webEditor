/**
 * LevelConfigConverter
 * Convert old level JSON format (listElementByGrid) →
 * new map config format (slotMap + elements) used by EditMapScene / BoardEditUI.
 *
 * Old format key:
 *   listElementByGrid[index] = [ slotInfo, elem1?, elem2?, ... ]
 *   slotInfo  = [_, canSpawn, ...]   (index 1: 1=canSpawn, 0=not)
 *   elemN     = [typeId]             hp defaults to 1
 *             | [typeId, hp]
 *
 * New format:
 *   slotMap[r][c]  : 0=disabled | 1=enabled | 2=enabled+canSpawn
 *   elements[]     : { row, col, type, hp }
 */
var LevelConfigConverter = {

    /**
     * @param {Object} levelJson  - Old level JSON object
     * @param {number} [rows=10]  - Board rows  (matches CoreGame.Config.BOARD_ROWS)
     * @param {number} [cols=9]   - Board cols  (matches CoreGame.Config.BOARD_COLS)
     * @returns {Object} mapConfig  { slotMap, elements }
     */
    convert: function (levelJson, rows, cols) {
        rows = rows || (CoreGame && CoreGame.Config ? CoreGame.Config.BOARD_ROWS : 10);
        cols = cols || (CoreGame && CoreGame.Config ? CoreGame.Config.BOARD_COLS : 9);

        // Initialize slotMap — all disabled by default
        var slotMap = [];
        for (var r = 0; r < rows; r++) {
            slotMap[r] = [];
            for (var c = 0; c < cols; c++) {
                slotMap[r][c] = 0;
            }
        }

        var elements = [];
        var grid = levelJson.listElementByGrid || {};

        for (var indexStr in grid) {
            if (!grid.hasOwnProperty(indexStr)) continue;

            var index = parseInt(indexStr, 10);
            var row = (rows - 1) - Math.floor(index / cols); // flip: old row 0 = new row rows-1
            var col = index % cols;

            if (row < 0 || row >= rows || col < 0 || col >= cols) {
                cc.log("LevelConfigConverter: index", index, "out of bounds, skipping");
                continue;
            }

            var entry = grid[indexStr];   // [ slotInfo, elem1?, elem2?, ... ]
            var slotInfo = entry[0];         // [_, canSpawn, ...]
            var canSpawn = Array.isArray(slotInfo) && slotInfo[1] === 1;

            // Mark slot enabled (+ canSpawn if applicable)
            slotMap[row][col] = canSpawn ? 2 : 1;

            // Parse elements (index 1 onwards in entry)
            for (var i = 1; i < entry.length; i++) {
                var elemArr = entry[i];
                if (!Array.isArray(elemArr) || elemArr.length === 0) continue;

                var typeId = elemArr[0];
                // var hp = (elemArr.length > 1 && typeof elemArr[1] === 'number') ? elemArr[1] : 1;
                var hp = (elemArr.length > 1) ? parseInt(elemArr[1]) : 1;

                // Swap gem color IDs: 4 <-> 6 (same rule as gemTypes)
                if (typeId === 6) typeId = 4;
                else if (typeId === 4) typeId = 6;

                // Adjust row for anchor-point difference:
                // Old config: anchor = top-left corner of element
                // New map:    anchor = bottom-left corner of element
                // After the row-flip, `row` points to what was the top row.
                // Subtract (elemHeight - 1) to get the bottom row in the new coord system.
                var elemSize = LevelConfigConverter.getElementSize(typeId);
                var elemRow = row - (elemSize.height - 1);

                var isOverlap = false;

                // Check overlap only if the current element has size 1x1
                if (elemSize.width === 1 && elemSize.height === 1) {
                    for (var e = 0; e < elements.length; e++) {
                        var existing = elements[e];
                        if (existing.type === 500) continue; // Skip Grass (ID 500)

                        var extSize = LevelConfigConverter.getElementSize(existing.type);

                        // Check bounding box intersection
                        if (elemRow >= existing.row && elemRow < existing.row + extSize.height &&
                            col >= existing.col && col < existing.col + extSize.width) {
                            isOverlap = true;
                            break;
                        }
                    }
                }

                if (!isOverlap) {
                    elements.push({
                        row: elemRow,
                        col: col,
                        type: typeId,
                        hp: hp
                    });
                }
            }
        }

        // numMove from old "move" field
        var numMove = levelJson.move || 30;

        // targetElements from old "listTarget": { "typeId": count, ... }
        var targetElements = [];
        var listTarget = levelJson.listTarget || {};
        for (var tid in listTarget) {
            if (!listTarget.hasOwnProperty(tid)) continue;
            targetElements.push({ id: parseInt(tid, 10), count: listTarget[tid] });
        }

        // gemTypes from old "listPercent": { "gemId": weight, ... }
        // Only include IDs with weight > 0. Swap ID 4 <-> 6.
        var gemTypes = [];
        var listPercent = levelJson.listPercent || {};
        for (var gid in listPercent) {
            if (!listPercent.hasOwnProperty(gid)) continue;
            if (listPercent[gid] <= 0) continue;
            var gemId = parseInt(gid, 10);
            if (gemId === 6) gemId = 4;
            else if (gemId === 4) gemId = 6;
            gemTypes.push(gemId);
        }

        // levelId, mapName, difficulty from old config
        var levelId = levelJson.levelId !== undefined ? levelJson.levelId : -1;
        var mapName = levelJson.mapName || '';
        var difficulty = levelJson.difficulty !== undefined ? levelJson.difficulty : 0;

        return {
            levelId: levelId,
            mapName: mapName,
            difficulty: difficulty,
            slotMap: slotMap,
            elements: elements,
            numMove: numMove,
            targetElements: targetElements,
            gemTypes: gemTypes
        };
    },

    /**
     * Get the logical grid size (in cells) of an element type.
     * Old config anchor = top-left; new map anchor = bottom-left.
     * For multi-row elements this offset must be applied during conversion.
     *
     * @param {number} typeId
     * @returns {Object} size {width, height} in cells (1 for single-cell elements)
     */
    getElementSize: function (typeId) {
        // Gems (1-7) are always 1x1
        if (typeId >= 1 && typeId <= 7) return { width: 1, height: 1 };

        // For registered ElementObject classes, create a temp instance to read size.
        // Use ElementObject.create() which handles ctor properly.
        if (CoreGame && CoreGame.ElementObject) {
            if (CoreGame.ElementObject.map[typeId]) {
                try {
                    var tmp = CoreGame.ElementObject.create(0, 0, typeId, 1);
                    return {
                        width: (tmp && tmp.size && tmp.size.width) || 1,
                        height: (tmp && tmp.size && tmp.size.height) || 1
                    };
                } catch (e) { /* fall through */ }
            }
        }

        // For JSON-configured blockers, read from preloaded config cache.
        if (CoreGame && CoreGame.BlockerFactory && CoreGame.BlockerFactory._configCache[typeId]) {
            var cfg = CoreGame.BlockerFactory._configCache[typeId];
            return {
                width: cfg.width || 1,
                height: cfg.height || 1
            };
        }

        return { width: 1, height: 1 }; // Default: 1x1
    },

    /**
     * Convert and return as JSON string (for pasting / saving).
     */
    convertToJson: function (levelJson, rows, cols) {
        var mapConfig = this.convert(levelJson, rows, cols);
        return JSON.stringify(mapConfig, null, 4);
    },

    /**
     * Convert from a raw JSON string.
     */
    convertFromString: function (jsonStr, rows, cols) {
        var levelJson = JSON.parse(jsonStr);
        return this.convert(levelJson, rows, cols);
    },

    /**
     * Read an old level file, convert it, and write the result to outputPath.
     *
     * @param {string}   inputPath  - e.g. "res/common/config/levels/level_1.json"
     * @param {string}   outputPath - e.g. "res/maps/level_1.json"
     * @param {number}   [rows]
     * @param {number}   [cols]
     * @param {Function} [callback] - optional callback(err, mapConfig)
     */
    convertFile: function (inputPath, outputPath, rows, cols, callback) {
        var self = this;
        cc.loader.loadJson(inputPath, function (err, levelJson) {
            if (err) {
                cc.log("LevelConfigConverter: failed to read", inputPath, err);
                if (callback) callback(err);
                return;
            }

            var mapConfig = self.convert(levelJson, rows, cols);
            var jsonStr = JSON.stringify(mapConfig, null, 4);

            if (typeof jsb !== "undefined" && jsb.fileUtils) {
                var ok = jsb.fileUtils.writeStringToFile(jsonStr, outputPath);
                if (ok) {
                    cc.log("LevelConfigConverter: saved →", outputPath);
                } else {
                    cc.log("LevelConfigConverter: FAILED to write →", outputPath);
                }
            } else {
                // Web/desktop fallback — log the JSON for manual copy
                cc.log("LevelConfigConverter [" + outputPath + "]:\n" + jsonStr);
            }

            if (callback) callback(null, mapConfig);
        });
    },

    /**
     * Batch-convert level_1.json → level_10.json from the old levels folder
     * into the new maps folder.
     *
     * @param {string}   [inputDir]   Source folder  (default: "res/common/config/levels")
     * @param {string}   [outputDir]  Output folder  (default: "res/maps")
     * @param {number}   [from=1]     First level number
     * @param {number}   [to=10]      Last level number
     * @param {number}   [rows]
     * @param {number}   [cols]
     * @param {Function} [onComplete] Called when all levels are done
     */
    convertAllLevels: function (inputDir, outputDir, from, to, rows, cols, onComplete) {
        inputDir = inputDir || "res/common/config/levels";
        outputDir = outputDir || "res/maps";
        from = from !== undefined ? from : 1;
        to = to !== undefined ? to : 10;

        var self = this;
        var index = from;
        var failed = [];

        function next() {
            if (index > to) {
                cc.log("LevelConfigConverter: batch done. Failed:", failed.length === 0 ? "none" : failed.join(", "));
                if (onComplete) onComplete(failed);
                return;
            }

            var n = index++;
            var inputPath = inputDir + "/lvl_" + n + ".json";
            var outputPath = outputDir + "/level_" + n + ".json";

            self.convertFile(inputPath, outputPath, rows, cols, function (err) {
                if (err) failed.push("level_" + n);
                next(); // process next level after this one finishes
            });
        }

        next();
    }
};


