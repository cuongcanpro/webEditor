/**
 * MilkCabinetUI - Visual for 2x2 Milk Cabinet using Spine
 * Part of Match-3 Core Game
 */
var CoreGame = CoreGame || {};

CoreGame.MilkCabinetUI = CoreGame.ElementUI.extend({

    cabinet: null,
    listBottle: [],
    door: null,

    ctor: function (element) {
        this._super(element);

        this.listBottle = []; // Reset array
        this.initSpine();
        this.updateVisual(true); // initial update

        return true;
    },

    initSpine: function () {
        if (typeof gv === 'undefined' || !resAni.spine_2900) return;

        this.nodeSpine = new cc.Node();
        this.addChild(this.nodeSpine);

        // 1. Cabinet Body
        this.cabinet = gv.createSpineAnimation(resAni.spine_2900);
        this.cabinet.setAnimation(0, "fridge0", false);
        this.nodeSpine.addChild(this.cabinet);


        // 2. Bottles
        var numBottle = 5;
        for (var i = 0; i < numBottle + 1; i++) {
            var bottle = gv.createSpineAnimation(resAni.spine_2900);
            bottle.setAnimation(0, "milk0", false);
            bottle.setPosition((i % 3 - 1) * 35, i < 3 ? 72 : 15);
            this.nodeSpine.addChild(bottle);
            this.listBottle.unshift(bottle);
        }

        // 3. Door
        this.door = gv.createSpineAnimation(resAni.spine_2900);
        this.door.setAnimation(0, "door0", false);
        this.nodeSpine.addChild(this.door);

        this.nodeSpine.setPosition(0, -35); // Guessing offset based on old code values roughly
        this.nodeSpine.setPosition(-4, -70);
    },

    /**
     * Update visual based on HP
     * HP: 7 (Full) -> 6 (Door Open) -> 5..1 (Collect Bottles) -> 0 (Done)
     */
    updateVisual: function (isInit) {
        var hitPoints = this.element.hitPoints;
        if (hitPoints === 7) {
            if (this.door) this.door.setAnimation(0, "door0", false);
            // Reset bottles if needed
        }
        else if (hitPoints === 6) {
            // Door Opened
            this.playExplodeEffect(7); // Trigger door effect logic
        }
        else if (hitPoints < 6 && hitPoints >= 0) {
            if (isInit) {
                if (hitPoints < 7) {
                    // Door gone/open already
                    if (this.door) this.door.setVisible(false); // or set open state
                }
            } else {
                this.playExplodeEffect(hitPoints + 1); // Play effect for previous state transition? 
            }
        }
    },

    /**
     * Play effect specific to the HP stage
     */
    playExplodeEffect: function (prevHitPoints) {
        var hp = prevHitPoints; // Simplified

        if (this.cabinet) this.cabinet.setAnimation(0, "fridge", false);

        if (hp == 7) {
            // Open Door
            if (this.door) {
                var rdDir = Math.random() < 0.5 ? "R" : "L";
                this.door.setAnimation(0, "door" + rdDir, false);
                gv.removeSpineAfterRun(this.door);
                this.door = null;

                if (typeof fr !== 'undefined' && fr.Sound)
                    fr.Sound.playSoundEffect(resSound.block_milk_pantry_1, false);
            }
        }
        else if (hp >= 1 && hp <= 6) {
            // Bottle Fly
            var idx = hp - 1;
            if (this.listBottle[idx]) {
                var wPos = this.listBottle[idx].getParent().convertToWorldSpace(this.listBottle[idx].getPosition());

                // VFX
                if (typeof gv !== 'undefined' && gv.createTLFX) {
                    gv.createTLFX("milk", wPos, this.getParent(), 100); // High Z
                }

                this.listBottle[idx].setVisible(false);
                this.listBottle[idx] = null;

                if (typeof fr !== 'undefined' && fr.Sound)
                    fr.Sound.playSoundEffect(resSound.block_milk_pantry_2, false);
            }
        }
        else if (hp <= 0) {
            // Cabinet Destroy
            if (typeof fr !== 'undefined' && fr.Sound)
                fr.Sound.playSoundEffect(resSound.block_milk_pantry_collect, false);

            if (this.cabinet) {
                this.cabinet.setAnimation(0, "fridge_end", false);
                // Delay remove self controlled by Entity logic
            }
        }
    }
});
