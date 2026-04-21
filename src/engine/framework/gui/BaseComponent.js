var BaseComponent = cc.Component.extend(
	{
		ctor: function(name)
		{
			this._super();
			this.setName(name);

			this._isInited = false;
			this._showHideAnimate = false;
			this._currentScaleBg = 1;

			this._scale = -1;
			if (this._scale < 0)
			{
				this._scale = cc.director.getWinSize().width / Constant.WIDTH;
				this._scale = (this._scale > 1) ? 1 : this._scale;
			}
			this.listSchedule = []; //tự quản lý list schedule ở js
		},

		//custom func được call sau khi cpn được add vào node
		onAwake: function()
		{
			this._layout = this.getOwner();

			try
			{
				this.initGUI();
			} catch (error)
			{
				//try catch vì func này nếu có lỗi sẽ không show log js tự động
				//show log error thủ công ở đây
				cc.log("ERROR: " + error.message);
				cc.log(error.stack);
			}
		},

		initGUI: function()
		{

		},

		onEnter: function()
		{
			// cc.log("BaseComponent::OnEnter => " + this.getName());
			this.onEnterFinish();
		},

		onEnterFinish: function()
		{

		},

		onExit: function()
		{

		},

		update: function(dt)
		{
			for (var i = this.listSchedule.length - 1; i >= 0; i--)
			{
				//update schedule theo dt
				this.listSchedule[i].update(dt);

				//xóa các schedule ko còn active nữa
				if (!this.listSchedule[i].isActive)
				{
					this.listSchedule.splice(i, 1);
				}
			}
		},

		schedule: function(callbackName, interval, repeat, delay, paused)
		{
			if (!interval)
			{
				interval = 0;
			}
			if (!repeat)
			{
				repeat = cc.REPEAT_FOREVER;
			}
			if (!delay)
			{
				delay = 0;
			}
			if (!paused)
			{
				paused = 0;
			}

			this.getOwner().scheduleUpdate();

			for (var i = 0; i < this.listSchedule.length; i++)
			{
				if (this.listSchedule[i].callbackName == callbackName)
				{
					this.listSchedule[i].updateData(interval, repeat, delay, paused);
					return;
				}
			}
			var schedule = new ComponentSchedule(this, callbackName, interval, repeat, delay, paused);
			this.listSchedule.push(schedule);
		},

		unschedule: function(callbackName)
		{
			for (var i = 0; i < this.listSchedule.length; i++)
			{
				if (this.listSchedule[i].callbackName == callbackName)
				{
					this.listSchedule[i].isActive = false;
					return;
				}
			}
		},

		unscheduleAllCallbacks: function()
		{
			for (var i = 0; i < this.listSchedule.length; i++)
			{
				this.listSchedule[i].isActive = false;
			}
		},

		delayCallback: function(callback, time)
		{
			this.getOwner().runAction(
				cc.sequence(
					cc.delayTime(time),
					cc.callFunc(callback.bind(this))
				)
			);
		},

		customizeButton: function(name, tag, parent)
		{
			var button = null;
			if (parent)
			{
				button = this.getControl(name, parent);
				// cc.log("BaseComponent::CustomizeButton - > ParentTag::" + parent.getTag());
			}
			else
			{
				button = this.getControl(name);
				// cc.log("BaseComponent::CustomizeButton - > NoParent");
			}

			if (!button)
			{
				// cc.log("BaseComponent::CustomizeButton - > NULL")
				return null;
			}

			button.setPressedActionEnabled(true);
			button.setTag(tag);
			button.addTouchEventListener(this.onTouchEventHandler, this);

			return button;
		},

		customButton: function(name, tag, parent, action, isAddTouchEventListener = true)
		{
			if (action === undefined)
			{
				action = true;
			}

			var btn = this.getControl(name, parent);
			if (!btn)
			{
				return null;
			}
			btn.setPressedActionEnabled(action);
			btn.setTag(tag);
			if (isAddTouchEventListener)
			{
				btn.addTouchEventListener(this.onTouchEventHandler, this);
			}
			return btn;
		},

		getButton: function(name, parent, action)
		{
			if (action === undefined)
			{
				action = true;
			}

			var btn = this.getControl(name, parent);
			if (!btn)
			{
				return null;
			}
			btn.setPressedActionEnabled(action);
			btn.addTouchEventListener(this.onTouchEventHandler, this);
			return btn;
		},

		setLabelText: function(text, control)
		{
			if (typeof text === 'undefined')
			{
				return;
			}
			if (typeof control === 'undefined')
			{
				return;
			}
			if (control == null)
			{
				return;
			}
			if (typeof control.getString() === 'undefined')
			{
				return;
			}

			var str = control.getString();
			var l1 = str.length;
			var l2 = text.length;

			if (control.subText !== undefined)
			{
				l1 = control.subText;

				if (l2 <= l1)
				{
					control.setString(text);
				}
				else
				{
					control.setString(text.substring(0, l1 - 2) + "...");
				}
			}
			else
			{
				if (control.wrapText !== undefined)
				{
					var s1 = control.width;
					var num = text.length;
					var str = "";
					var result = "";
					for (var i = 0; i < num; i++)
					{
						str += text.charAt(i);
						result += text.charAt(i);
						control.setString(str);
						if (text.charAt(i) == " ")
						{
							if (control.width > s1)
							{
								result += "\n";
								str = "";
							}
						}
					}
					control.setString(result);
				}
				else
				{
					control.setString(text);
				}
			}
		},

		getControl: function(cName, parent)
		{
			var p = null;
			var sParent = "";
			if (typeof parent === 'undefined')
			{
				p = this.getOwner();
				sParent = "layout";
			}
			else
			{
				if (typeof parent === 'string')
				{
					p = ccui.Helper.seekWidgetByName(this.getOwner(), parent);
					sParent = parent;
				}
				else
				{
					p = parent;
					sParent = "object";
				}
			}

			if (p == null)
			{
				cc.log("###################### getControl error parent " + cName + "/" + sParent);
				return null;
			}
			var control = ccui.Helper.seekWidgetByName(p, cName);
			if (control == null)
			{
				cc.log("###################### getControl error control " + cName + "/" + sParent);
				return null;
			}
			this.analyzeCustomControl(control);
			try
			{
				control.setString(StringUtility.getStringLocalized(control.getString()));
			} catch (e)
			{

			}
			return control;
		},

		processScaleControl: function(control, direct)
		{
			//FIXME: this functon copy from BaseLayer, there is no this._scale;
			return;
			if (direct === undefined)
			{
				control.setScale(this._scale);
			}
			else
			{
				if (direct == 1)
				{
					control.setScaleX(this._scale);
				}
				else
				{
					control.setScaleY(this._scale);
				}
			}
		},

		analyzeCustomControl: function(control)
		{
			if (control.customData === undefined)
			{
				if (control.getTag() < 0) // scale theo ty le nho nhat
				{
					this.processScaleControl(control);
				}
				return;
			}

			var s = control.customData;

			if (s.indexOf("scale") > -1) // scale theo ty le nho nhat
			{
				if (s.indexOf("scaleX") > -1)
				{
					this.processScaleControl(control, 1);
				}
				else
				{
					if (s.indexOf("scaleY") > -1)
					{
						this.processScaleControl(control, 0);
					}
					else
					{
						this.processScaleControl(control);
					}
				}
			}

			if (s.indexOf("subText") > -1) // set text gioi han string
			{
				control["subText"] = control.getString().length;
			}

			if (s.indexOf("wrapText") > -1) // set text cat strign xuong dong
			{
				control["wrapText"] = control.getString().length;
			}
		},

		resetDefaultPosition: function(control)
		{
			if (control === undefined)
			{
				return;
			}

			try
			{
				if (control.defaultPos === undefined)
				{
					control.defaultPos = control.getPosition();
				}
				else
				{
					control.setPosition(control.defaultPos);
				}
			} catch (e)
			{

			}
		},

		setShowHideAnimate: function(parent, customScale)
		{
			this._showHideAnimate = true;
			if (parent === undefined)
			{
				this._bgShowHideAnimate = this.getOwner();
			}
			else
			{
				this._bgShowHideAnimate = parent;
			}
			if (customScale === undefined)
			{
				customScale = false;
			}

			this._currentScaleBg = customScale ? this._bgShowHideAnimate.getScale() : 1;
			// cc.log("SETSHOW HIDE ANIMATE = " + this._currentScaleBg);
			this._bgShowHideAnimate.setScale(0.75 * this._currentScaleBg);
			this._bgShowHideAnimate.setOpacity(0);
			this._bgShowHideAnimate.runAction(cc.sequence(cc.spawn(new cc.EaseBackOut(cc.scaleTo(0.25, this._currentScaleBg)), cc.fadeIn(0.25)), cc.callFunc(this.finishAnimate, this)));
		},

		finishAnimate: function()
		{

		},

		onClose: function()
		{
			if (this._showHideAnimate)
			{
				this._bgShowHideAnimate.setScale(this._currentScaleBg);
				this._bgShowHideAnimate.runAction(cc.spawn(cc.scaleTo(0.15, 0.75), cc.fadeOut(0.15)));
				setTimeout(this.onCloseDone.bind(this), 150);
				// this.runAction(cc.sequence(cc.delayTime(0.15),cc.callFunc(this.onCloseDone.bind(this))));
			}
			else
			{
				this.onCloseDone();
			}
		},

		onCloseDone: function()
		{
			/****Override meeeeeeeeeeeeeeee */
		},

		/************ touch event handler *************/
		onTouchEventHandler: function(sender, type)
		{

			// cc.log("BaseComponent::OnTouchEventHandler")
			if (!this.getOwner().isVisible())
			{
				return;
			}
			// cc.log("BaseComponent::OnTouchEventHandler::PASSED =>" + this.getOwner().isVisible())
			switch (type)
			{
				case ccui.Widget.TOUCH_BEGAN:
					this.onButtonTouched(sender, sender.getTag());
					break;
				case ccui.Widget.TOUCH_ENDED:
					this.onButtonRelease(sender, sender.getTag());
					break;
				case ccui.Widget.TOUCH_CANCELED:
					this.onButtonCanceled(sender, sender.getTag());
					break;
			}
		},
		////////////////////////////////////////////
		/******* functions need override  *******/
		onButtonRelease: function(button, id)
		{
			/*    override meeeeeeeeee  */
		},

		onButtonTouched: function(button, id)
		{
			/*    override meeeeeeeeee  */
		},

		onButtonCanceled: function(button, id)
		{
			/*    override meeeeeeeeee  */
		},

		addComponent: function(component)
		{
			this.getOwner().addComponent(component);
		},

		getComponent: function(component)
		{
			return this.getOwner().getComponent(component);
		}
	});

var ComponentSchedule = cc.Class.extend({

	ctor: function(target, callbackName, interval, repeat, delay, paused)
	{

		this.target = target;
		this.callbackName = callbackName;

		this.updateData(interval, repeat, delay, paused);

		this.currentTime = 0;
		this.timeCalled = 0;
		this.isActive = true;
	},

	updateData: function(interval, repeat, delay, paused)
	{
		this.interval = interval ? interval : 0;

		this.repeat = repeat ? repeat : cc.REPEAT_FOREVER;
		this.delay = delay ? delay : 0;
		this.isPaused = paused ? paused : false;
	},

	pause: function()
	{
		this.isPaused = true;
	},

	resume: function()
	{
		this.isPaused = false;
	},

	update: function(dt)
	{

		if (!this.isActive)
		{
			return;
		}
		if (this.isPaused)
		{
			return;
		}

		if (this.delay > 0)
		{
			if (this.delay > dt)
			{
				this.delay -= dt;
				return;
			}
			else
			{
				dt -= this.delay;
				this.delay = 0;
			}
		}

		//loop by frame
		if (this.interval <= 0)
		{
			this.callback(dt);
		}
		else
		{
			this.currentTime += dt;
			if (this.currentTime >= this.interval)
			{
				this.callback(this.interval);
				this.currentTime -= this.interval;
			}
		}

		if (this.repeat != cc.REPEAT_FOREVER)
		{
			if (this.timeCalled >= this.repeat)
			{
				this.isActive = false;
			}
		}
	},

	callback: function(dt)
	{
		try
		{
			this.target[this.callbackName].call(this.target, dt);
			this.timeCalled++;
		} catch (error)
		{

		}
	}
});