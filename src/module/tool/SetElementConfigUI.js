/**
 * SetElementConfigUI - UI for configuring element properties (HP)
 * Shows input field for HP when selected element has maxHp > 1
 */
var SetElementConfigUI = cc.Node.extend({
    container: null,
    hpLabel: null,
    hpInput: null,
    currentElement: null,
    onConfigChangeCallback: null,
    // Callback riêng cho chế độ "chỉnh HP block đã đặt" (Update HP từ menu chuột phải).
    // Khi set, onHPChanged route qua đây thay vì onConfigChangeCallback (paint flow).
    _editCallback: null,
    // Direction row (shown only for TentacleBlocker type 30200)
    directionRow: null,
    currentDirection: "RIGHT",
    _dirBtns: null,

    TENTACLE_TYPE: 30200,
    // Tủ nước màu: máu cố định 4 (4 chai), không cho chỉnh -> ẩn panel HP.
    COLOR_CABINET_TYPE: 18000,
    // Trần HP khi chỉnh trong editor — bỏ giới hạn maxHP của config, cho chỉnh tự do tới đây.
    MAX_HP: 100,

    /**
     * Constructor
     * @param {Function} onConfigChangeCallback - Callback when HP value changes (hp)
     */
    ctor: function (onConfigChangeCallback) {
        this._super();

        this.onConfigChangeCallback = onConfigChangeCallback;
        this.setContentSize(340, 160);

        this.initUI();
        this.setVisible(false); // Hidden by default

    },

    /**
     * Initialize UI components
     */
    initUI: function () {
        var self = this;

        // Create container background
        this.container = new ccui.Layout();
        this.container.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        this.container.setBackGroundColor(cc.color(50, 50, 60));
        this.container.setContentSize(340, 160);
        this.addChild(this.container);

        // Add title
        var title = new cc.LabelTTF("Element Config", "Arial", 18);
        title.setPosition(170, 135);
        title.setColor(cc.color(255, 255, 255));
        this.container.addChild(title);

        // Add close button
        var btnClose = new ccui.Button();
        btnClose.loadTextureNormal("res/tool/res/bgCell.png");
        btnClose.setScale9Enabled(true);
        btnClose.setContentSize(30, 30);
        btnClose.setTitleText("X");
        btnClose.setTitleFontSize(18);
        btnClose.setPosition(320, 135);
        btnClose.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self._editCallback = null; // thoát chế độ Update HP
                self.setVisible(false);
            }
        });
        this.container.addChild(btnClose);

        // Direction row for TentacleBlocker (hidden by default)
        this.directionRow = new ccui.Layout();
        this.directionRow.setContentSize(340, 40);
        this.directionRow.setPosition(0, 90);
        this.directionRow.setVisible(false);
        this.container.addChild(this.directionRow);

        var dirLabel = new cc.LabelTTF("Dir:", "Arial", 16);
        dirLabel.setPosition(25, 20);
        dirLabel.setColor(cc.color(255, 255, 255));
        dirLabel.setAnchorPoint(0, 0.5);
        this.directionRow.addChild(dirLabel);

        var DIRS = [
            { label: "←", key: "LEFT",  x: 75  },
            { label: "↑", key: "UP",    x: 120 },
            { label: "↓", key: "DOWN",  x: 165 },
            { label: "→", key: "RIGHT", x: 210 }
        ];
        this._dirBtns = {};
        for (var di = 0; di < DIRS.length; di++) {
            (function (d) {
                var b = new ccui.Button();
                b.loadTextureNormal("res/tool/res/bgCell.png");
                b.setScale9Enabled(true);
                b.setContentSize(36, 32);
                b.setTitleText(d.label);
                b.setTitleFontSize(20);
                b.setPosition(d.x, 20);
                b.addTouchEventListener(function (sender, type) {
                    if (type === ccui.Widget.TOUCH_ENDED) {
                        self._setDirection(d.key);
                    }
                });
                self.directionRow.addChild(b);
                self._dirBtns[d.key] = b;
            })(DIRS[di]);
        }
        this._setDirection("RIGHT");

        // Add HP label
        this.hpLabel = new cc.LabelTTF("HP:", "Arial", 20);
        this.hpLabel.setPosition(30, 55);
        this.hpLabel.setColor(cc.color(255, 255, 255));
        this.hpLabel.setAnchorPoint(0, 0.5);
        this.container.addChild(this.hpLabel);

        // HP stepper row:  [-10] [-] [input] [+] [+10]  / MAX
        // Shared factory keeps the five stepper buttons consistent.
        var mkStepBtn = function (x, w, title, fs, handler) {
            var b = new ccui.Button();
            b.loadTextureNormal("res/tool/res/bgCell.png");
            b.setScale9Enabled(true);
            b.setContentSize(w, 38);
            b.setTitleText(title);
            b.setTitleFontSize(fs);
            b.setPosition(x, 55);
            b.addTouchEventListener(function (sender, type) {
                if (type === ccui.Widget.TOUCH_ENDED) handler();
            });
            self.container.addChild(b);
            return b;
        };

        var btnMinus10 = mkStepBtn(82, 38, "-10", 16, function () { self.decrementHP10(); });
        var btnMinus = mkStepBtn(122, 30, "-", 24, function () { self.decrementHP(); });

        // Create HP input field
        this.hpInput = new cc.EditBox(cc.size(50, 40), new cc.Scale9Sprite());
        this.hpInput.setFontName("font/BalooPaaji2-Regular.ttf");
        this.hpInput.setPlaceHolder("1");
        this.hpInput.setPlaceholderFontColor(cc.color(150, 150, 150));
        this.hpInput.setFontColor(cc.color(255, 255, 255));
        this.hpInput.setFontSize(24);
        this.hpInput.setMaxLength(3);   // tới 3 chữ số để gõ được 100
        this.hpInput.setInputMode(cc.EDITBOX_INPUT_MODE_NUMERIC);
        this.hpInput.setReturnType(cc.KEYBOARD_RETURNTYPE_DONE);
        this.hpInput.setString("1");
        this.hpInput.setPosition(172, 55);
        this.container.addChild(this.hpInput);

        // Add input event listener — fire when the user finishes editing.
        this.hpInput.setDelegate({
            editBoxEditingDidEnd: function (sender) {
                self.onHPChanged();
            }
        });

        var btnPlus = mkStepBtn(222, 30, "+", 24, function () { self.incrementHP(); });
        var btnPlus10 = mkStepBtn(262, 38, "+10", 16, function () { self.incrementHP10(); });
        this.btnPlus = btnPlus;
        this.btnMinus = btnMinus;
        this.btnPlus10 = btnPlus10;
        this.btnMinus10 = btnMinus10;

        // Add max HP display
        this.maxHpLabel = new cc.LabelTTF("/ " + this.MAX_HP, "font/BalooPaaji2-Regular.ttf", 18);
        this.maxHpLabel.setPosition(289, 55);
        this.maxHpLabel.setColor(cc.color(180, 180, 180));
        this.maxHpLabel.setAnchorPoint(0, 0.5);
        this.container.addChild(this.maxHpLabel);

        // Add info label at bottom
        var infoLabel = new cc.LabelTTF("Set element HP", "font/BalooPaaji2-Regular.ttf", 14);
        infoLabel.setPosition(150, 20);
        infoLabel.setColor(cc.color(150, 150, 150));
        this.container.addChild(infoLabel);

        // Swallow touches on the popup background so a click on the gray area
        // doesn't fall through to the board/map below. Child widgets (buttons,
        // text field) sit in front and consume their own touches first; this
        // only catches presses on empty popup space. Only active while visible.
        var bgSwallow = cc.EventListener.create({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function (touch, event) {
                if (!self.isVisible()) return false;
                var loc = self.convertToNodeSpace(touch.getLocation());
                var sz = self.getContentSize();
                return cc.rectContainsPoint(cc.rect(0, 0, sz.width, sz.height), loc);
            }
        });
        cc.eventManager.addListener(bgSwallow, this);
    },

    _setDirection: function (key) {
        this.currentDirection = key;
        for (var k in this._dirBtns) {
            if (this._dirBtns[k]) {
                this._dirBtns[k].setColor(k === key ? cc.color(80, 200, 80) : cc.color(255, 255, 255));
            }
        }
    },

    getDirection: function () {
        return this.currentDirection;
    },

    /**
     * Set element to configure
     * @param {number} type - Element type ID
     */
    setElement: function (type) {
        this._editCallback = null; // setElement = paint flow; rời chế độ Update HP
        if (type === null || type === undefined) {
            this.setVisible(false);
            this.currentElement = null;
            return;
        }

        // Create temporary element to check maxHP
        var element = null;
        if (CoreGame.ElementObject.map[type]) {
            element = CoreGame.ElementObject.create(0, 0, type, 1);
        } else {
            element = CoreGame.BlockerFactory.createBlocker(0, 0, type, 1);
        }

        if (!element) {
            this.setVisible(false);
            this.currentElement = null;
            return;
        }
        cc.log("Element max hp: ", element.configData.maxHP);
        cc.log("Element config  : ", JSON.stringify(element.configData));
        var maxHP = element.configData ? element.configData.maxHP : 1;
        var noPrompt = element.configData && element.configData.noHPPrompt;

        var isTentacle = (type === this.TENTACLE_TYPE);

        // Tủ nước màu khoá cứng 4 máu (bỏ qua config) -> không cần panel Element Config.
        if (type === this.COLOR_CABINET_TYPE) {
            this.setVisible(false);
            this.currentElement = null;
            if (element && element.ui) element.ui.removeFromParent();
            return;
        }

        // Show for tentacle (always) or any element with maxHP > 1
        if (maxHP > 1 || isTentacle) {
            this.currentElement = {
                type: type,
                // Bỏ trần theo config — cho chỉnh HP tự do tới MAX_HP (100).
                maxHP: this.MAX_HP
            };
            this.maxHpLabel.setString("/ " + this.MAX_HP);
            this.hpInput.setString(isTentacle ? "5" : "1");
            // Show/hide direction row
            if (this.directionRow) this.directionRow.setVisible(isTentacle);
            this.updateButtonState();
            this.setVisible(true);
            cc.log("SetElementConfigUI: Element type", type, "has maxHP", maxHP, "isTentacle:", isTentacle);
        } else {
            this.setVisible(false);
            this.currentElement = null;
        }

        // Clean up temporary element
        if (element && element.ui) {
            element.ui.removeFromParent();
        }
    },

    /**
     * Mở popup để chỉnh HP cho 1 block ĐÃ đặt sẵn trên bàn (menu chuột phải → Update HP).
     * Khác setElement() (dùng khi vẽ): pre-fill HP hiện tại và route thay đổi qua
     * callback riêng, KHÔNG đụng tới selectedHP của paint flow.
     * @param {number}   type    element type của block
     * @param {number}   curHP   HP hiện tại để pre-fill
     * @param {Function} onApply gọi mỗi lần HP đổi: onApply(newHP)
     * @returns {boolean} true nếu block này chỉnh HP được (maxHP > 1); false nếu không
     */
    editExistingHP: function (type, curHP, onApply) {
        this._editCallback = null;      // tránh trigger callback trong lúc setElement
        this.setElement(type);          // cấu hình maxHP / hiển thị theo type
        if (!this.isVisible() || !this.currentElement) {
            return false;               // maxHP <= 1 hoặc type không hợp lệ -> không chỉnh được
        }
        var hp = parseInt(curHP, 10);
        if (isNaN(hp) || hp < 1) hp = 1;
        // Block có thể đã đặt HP cao hơn config max -> nới trần popup theo HP hiện tại.
        if (hp > this.currentElement.maxHP) {
            this.currentElement.maxHP = hp;
            this.maxHpLabel.setString("/ " + hp);
        }
        this.hpInput.setString(String(hp));
        this.updateButtonState();
        this._editCallback = onApply;
        return true;
    },

    /**
     * Get current HP value
     */
    getHP: function () {
        var hp = parseInt(this.hpInput.getString());
        if (isNaN(hp) || hp < 1) {
            hp = 1;
        }
        if (this.currentElement && hp > this.currentElement.maxHP) {
            hp = this.currentElement.maxHP;
        }
        return hp;
    },

    /**
     * Enable/disable +/- buttons based on current HP vs min/max bounds
     */
    updateButtonState: function () {
        var currentHP = this.getHP();
        var maxHP = this.currentElement ? this.currentElement.maxHP : 1;

        // NOTE: Keep touch ENABLED even when at bounds so the button still
        // swallows the touch. Disabling touch lets the press fall through to
        // the map below, causing an accidental click there. The increment/
        // decrement handlers already no-op at the bounds, so this is safe.
        var atMax = currentHP >= maxHP;
        var atMin = currentHP <= 1;
        var dim = cc.color(120, 120, 120);
        var bright = cc.color(255, 255, 255);
        if (this.btnPlus) {
            this.btnPlus.setBright(!atMax);
            this.btnPlus.setColor(atMax ? dim : bright);
        }
        if (this.btnPlus10) {
            this.btnPlus10.setBright(!atMax);
            this.btnPlus10.setColor(atMax ? dim : bright);
        }
        if (this.btnMinus) {
            this.btnMinus.setBright(!atMin);
            this.btnMinus.setColor(atMin ? dim : bright);
        }
        if (this.btnMinus10) {
            this.btnMinus10.setBright(!atMin);
            this.btnMinus10.setColor(atMin ? dim : bright);
        }
    },

    /**
     * Increment HP value
     */
    incrementHP: function () {
        if (!this.currentElement) return;

        var currentHP = this.getHP();
        if (currentHP < this.currentElement.maxHP) {
            currentHP++;
            cc.log("Increment HP " + currentHP);
            this.hpInput.setString(currentHP.toString());
            this.onHPChanged();
        }
    },

    /**
     * Decrement HP value
     */
    decrementHP: function () {
        var currentHP = this.getHP();
        if (currentHP > 1) {
            currentHP--;
            this.hpInput.setString(currentHP.toString());
            this.onHPChanged();
        }
    },

    /**
     * Increment HP by 10 (clamped to MAX_HP)
     */
    incrementHP10: function () {
        if (!this.currentElement) return;
        var hp = this.getHP();
        if (hp >= this.currentElement.maxHP) return;
        hp = Math.min(hp + 10, this.currentElement.maxHP);
        this.hpInput.setString(hp.toString());
        this.onHPChanged();
    },

    /**
     * Decrement HP by 10 (clamped to 1)
     */
    decrementHP10: function () {
        var hp = this.getHP();
        if (hp <= 1) return;
        hp = Math.max(hp - 10, 1);
        this.hpInput.setString(hp.toString());
        this.onHPChanged();
    },

    /**
     * Handle HP value change
     */
    onHPChanged: function () {
        var hp = this.getHP();

        // Validate and update input
        this.hpInput.setString(hp.toString());

        // Refresh +/- enabled state
        this.updateButtonState();

        // Trigger callback — ưu tiên chế độ Update HP (chỉnh block đã đặt);
        // nếu không thì về paint flow (đặt selectedHP).
        if (this._editCallback) {
            this._editCallback(hp);
        } else if (this.onConfigChangeCallback) {
            this.onConfigChangeCallback(hp);
        }

        cc.log("HP changed to:", hp);
    }
});
