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

    /**
     * Constructor
     * @param {Function} onConfigChangeCallback - Callback when HP value changes (hp)
     */
    ctor: function (onConfigChangeCallback) {
        this._super();

        this.onConfigChangeCallback = onConfigChangeCallback;
        this.setContentSize(300, 120);

        this.initUI();
        this.setVisible(false); // Hidden by default

    },

    /**
     * Initialize UI components
     */
    initUI: function () {
        var self = this;

        // Create container background (larger size)
        this.container = new ccui.Layout();
        this.container.setBackGroundColorType(ccui.Layout.BG_COLOR_SOLID);
        this.container.setBackGroundColor(cc.color(50, 50, 60));
        this.container.setContentSize(300, 120);
        this.addChild(this.container);

        // Add title
        var title = new cc.LabelTTF("Element Config", "Arial", 18);
        title.setPosition(150, 95);
        title.setColor(cc.color(255, 255, 255));
        this.container.addChild(title);

        // Add close button
        var btnClose = new ccui.Button();
        btnClose.loadTextureNormal("res/tool/res/bgCell.png");
        btnClose.setScale9Enabled(true);
        btnClose.setContentSize(30, 30);
        btnClose.setTitleText("X");
        btnClose.setTitleFontSize(18);
        btnClose.setPosition(280, 95);
        btnClose.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self.setVisible(false);
            }
        });
        this.container.addChild(btnClose);

        // Add HP label
        this.hpLabel = new cc.LabelTTF("HP:", "Arial", 20);
        this.hpLabel.setPosition(30, 55);
        this.hpLabel.setColor(cc.color(255, 255, 255));
        this.hpLabel.setAnchorPoint(0, 0.5);
        this.container.addChild(this.hpLabel);

        // Add increment/decrement buttons
        var btnMinus = new ccui.Button();
        btnMinus.loadTextureNormal("res/tool/res/bgCell.png");
        btnMinus.setScale9Enabled(true);
        btnMinus.setContentSize(40, 40);
        btnMinus.setTitleText("-");
        btnMinus.setTitleFontSize(24);
        btnMinus.setPosition(100, 55);
        btnMinus.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self.decrementHP();
            }
        });
        this.container.addChild(btnMinus);

        // Create HP input field
        this.hpInput = new ccui.TextField();
        this.hpInput.setFontName("font/BalooPaaji2-Regular.ttf");
        this.hpInput.setPlaceHolder("1");
        this.hpInput.setPlaceHolderColor(cc.color(150, 150, 150));
        this.hpInput.setTextColor(cc.color(255, 255, 255));
        this.hpInput.setFontSize(24);
        this.hpInput.setMaxLength(2);
        this.hpInput.setMaxLengthEnabled(true);
        this.hpInput.setTouchEnabled(true);
        this.hpInput.setString("1");
        this.hpInput.setPosition(155, 55);
        // this.hpInput.setContentSize(50, 40);
        this.container.addChild(this.hpInput);

        // Add input event listener
        this.hpInput.addEventListener(function (sender, type) {
            if (type === ccui.TextField.EVENT_DETACH_WITH_IME) {
                // When user finishes editing
                self.onHPChanged();
            }
        });

        var btnPlus = new ccui.Button();
        btnPlus.loadTextureNormal("res/tool/res/bgCell.png");
        btnPlus.setScale9Enabled(true);
        btnPlus.setContentSize(40, 40);
        btnPlus.setTitleText("+");
        btnPlus.setTitleFontSize(24);
        btnPlus.setPosition(210, 55);
        btnPlus.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                self.incrementHP();
            }
        });
        this.container.addChild(btnPlus);

        // Add max HP display
        this.maxHpLabel = new cc.LabelTTF("/ 1", "font/BalooPaaji2-Regular.ttf", 18);
        this.maxHpLabel.setPosition(260, 55);
        this.maxHpLabel.setColor(cc.color(180, 180, 180));
        this.maxHpLabel.setAnchorPoint(0, 0.5);
        this.container.addChild(this.maxHpLabel);

        // Add info label at bottom
        var infoLabel = new cc.LabelTTF("Set element HP", "font/BalooPaaji2-Regular.ttf", 14);
        infoLabel.setPosition(150, 20);
        infoLabel.setColor(cc.color(150, 150, 150));
        this.container.addChild(infoLabel);
    },

    /**
     * Set element to configure
     * @param {number} type - Element type ID
     */
    setElement: function (type) {
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

        var maxHP = element.configData ? element.configData.maxHP : 1;

        // Only show if maxHP > 1
        if (maxHP > 1) {
            this.currentElement = {
                type: type,
                maxHP: maxHP
            };
            this.maxHpLabel.setString("/ " + maxHP);
            this.hpInput.setString("1");
            this.setVisible(true);

            cc.log("SetElementConfigUI: Element type", type, "has maxHP", maxHP);
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
     * Increment HP value
     */
    incrementHP: function () {
        if (!this.currentElement) return;

        var currentHP = this.getHP();
        if (currentHP < this.currentElement.maxHP) {
            currentHP++;
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
     * Handle HP value change
     */
    onHPChanged: function () {
        var hp = this.getHP();

        // Validate and update input
        this.hpInput.setString(hp.toString());

        // Trigger callback
        if (this.onConfigChangeCallback) {
            this.onConfigChangeCallback(hp);
        }

        cc.log("HP changed to:", hp);
    }
});
