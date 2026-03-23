/**
 * Created by Antigravity.
 */

var GeminiDialog = cc.Layer.extend({
    ctor: function () {
        this._super();
        // Selected logic
        this.PROVIDER = "gemini";
        this.MODEL = "gemini-2.5-flash";
        this.availableModels = [];

        // Store conversation context
        this.chatHistory = [];

        // Optional callback invoked when dialog is closed
        this.onCloseCallback = null;

        this.initUI();
    },

    close: function () {
        this.removeFromParent();
        if (typeof this.onCloseCallback === 'function') {
            this.onCloseCallback();
        }
    },

    initUI: function () {
        var winSize = cc.director.getWinSize();

        // Dark background overriding touches
        var bg = new cc.LayerColor(cc.color(0, 0, 0, 180));
        this.addChild(bg);
        cc.eventManager.addListener({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: function () { return true; }
        }, bg);

        // Dialog Panel
        var panel = new cc.LayerColor(cc.color(40, 44, 52, 255), winSize.width * 0.8, winSize.height * 0.8);
        panel.setPosition(winSize.width * 0.1, winSize.height * 0.1);
        this.addChild(panel);

        // Title
        var titleText = "Block AI generator Chat";
        var title = new ccui.Text(titleText, "Arial", 30);
        title.setPosition(panel.width / 2, panel.height - 30);
        panel.addChild(title);

        // Close Button
        var closeBtn = new ccui.Button();
        closeBtn.setTitleText("X");
        closeBtn.setTitleFontSize(30);
        closeBtn.setTitleColor(cc.color.RED);
        closeBtn.setPosition(panel.width - 30, panel.height - 30);
        closeBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                this.close();
            }
        }, this);
        panel.addChild(closeBtn);

        // API Key Input Background
        var apiKeyWidth = panel.width - 350;
        var apiKeyBg = new cc.LayerColor(cc.color(255, 255, 255, 255), apiKeyWidth, 40);
        apiKeyBg.setPosition(20, panel.height - 90);
        panel.addChild(apiKeyBg);

        // API Key Input
        this.apiKeyInput = new cc.EditBox(cc.size(apiKeyWidth, 40), new cc.Scale9Sprite());
        this.apiKeyInput.setPosition(20 + apiKeyBg.width / 2, apiKeyBg.y + apiKeyBg.height / 2);
        this.apiKeyInput.setFontSize(20);
        this.apiKeyInput.setFontColor(cc.color.BLACK);
        this.apiKeyInput.setPlaceHolder("Enter Gemini API Key here...");
        this.apiKeyInput.setPlaceholderFontColor(cc.color.GRAY);
        this.apiKeyInput.setMaxLength(100);

        // Load saved API Key if any
        var savedKey = fr.UserData.getStringFromKey("GEMINI_API_KEY", "");
        if (savedKey) {
            this.apiKeyInput.setString(savedKey);
        }
        panel.addChild(this.apiKeyInput);

        // Provider Selector Button
        var prvBtnBg = new cc.LayerColor(cc.color(80, 80, 80, 255), 140, 40);
        prvBtnBg.setPosition(panel.width - 310, panel.height - 90);
        panel.addChild(prvBtnBg);

        this.prvBtn = new ccui.Button();
        this.prvBtn.setTitleText(this.PROVIDER.toUpperCase());
        this.prvBtn.setTitleFontSize(16);
        this.prvBtn.setPosition(prvBtnBg.width / 2, prvBtnBg.height / 2);
        this.prvBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                var self = this;
                var providers = ["gemini", "openai", "zingplay"];
                var selector = new ModelSelectorUI(providers, self.PROVIDER, function (selected) {
                    self.PROVIDER = selected;
                    self.prvBtn.setTitleText(selected.toUpperCase());
                    // Reset model and fetch new list
                    self.MODEL = "Loading...";
                    self.modelBtn.setTitleText(self.MODEL);
                    self.fetchAvailableModels();
                });
                cc.director.getRunningScene().addChild(selector, 9999);
            }
        }, this);
        prvBtnBg.addChild(this.prvBtn);

        // Model Selector Button
        var modelBtnBg = new cc.LayerColor(cc.color(80, 80, 80, 255), 140, 40);
        modelBtnBg.setPosition(panel.width - 160, panel.height - 90);
        panel.addChild(modelBtnBg);

        this.modelBtn = new ccui.Button();
        this.modelBtn.setTitleText(this.MODEL);
        this.modelBtn.setTitleFontSize(16);
        this.modelBtn.setPosition(modelBtnBg.width / 2, modelBtnBg.height / 2);
        this.modelBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                if (this.availableModels.length <= 1) return; // Disallow selecting if only 1 or 0 options

                var self = this;
                var modelSelector = new ModelSelectorUI(this.availableModels, this.MODEL, function (selectedModel) {
                    self.MODEL = selectedModel;
                    self.modelBtn.setTitleText(selectedModel);
                });
                cc.director.getRunningScene().addChild(modelSelector, 9999);
            }
        }, this);
        modelBtnBg.addChild(this.modelBtn);

        // Fetch models list once on init
        this.fetchAvailableModels();

        // Scroll View for messages
        this.scrollView = new ccui.ScrollView();
        this.scrollView.setDirection(ccui.ScrollView.DIR_VERTICAL);
        this.scrollView.setTouchEnabled(true);
        this.scrollView.setBounceEnabled(true);
        this.scrollView.setContentSize(cc.size(panel.width - 40, panel.height - 210));
        this.scrollView.setPosition(20, 100);
        this.scrollView.setInnerContainerSize(this.scrollView.getContentSize());
        panel.addChild(this.scrollView);

        // Background for scroll view
        var svBg = new cc.LayerColor(cc.color(30, 34, 42, 255), this.scrollView.width, this.scrollView.height);
        svBg.setPosition(this.scrollView.getPosition());
        panel.addChild(svBg, -1);

        // Content Text - using LabelTTF for proper long text wrapping
        var textWidth = this.scrollView.width - 20;
        this.chatText = new cc.LabelTTF("", "Arial", 18, cc.size(textWidth, 0), cc.TEXT_ALIGNMENT_LEFT, cc.VERTICAL_TEXT_ALIGNMENT_TOP);
        this.chatText.setAnchorPoint(0, 1); // Anchor Top-Left
        this.chatText.setColor(cc.color.WHITE);
        this.chatText.setPosition(10, this.scrollView.height - 10);
        this.scrollView.addChild(this.chatText);

        // New Chat Button
        var newBtn = new ccui.Button();
        newBtn.setTitleText("New");
        newBtn.setTitleFontSize(24);
        newBtn.setTitleColor(cc.color.WHITE);

        var newBg = new cc.LayerColor(cc.color(200, 50, 50, 255), 80, 40);
        newBg.setPosition(panel.width - 210, 30);
        panel.addChild(newBg);

        newBtn.setPosition(panel.width - 170, 50);
        newBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                this.startNewChat();
            }
        }, this);
        panel.addChild(newBtn);

        // Manual Tool Button
        var manualToolBtn = new ccui.Button();
        manualToolBtn.setTitleText("Manual Tool");
        manualToolBtn.setTitleFontSize(24);
        manualToolBtn.setTitleColor(cc.color.WHITE);

        var manualToolBg = new cc.LayerColor(cc.color(100, 100, 100, 255), 180, 40);
        manualToolBg.setPosition(20, -10);
        panel.addChild(manualToolBg);

        manualToolBtn.setPosition(110, 10);
        manualToolBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                this.close();
                var scene = new cc.Scene();
                var layer = new BlockCreatorUI();
                scene.addChild(layer);
                cc.director.runScene(scene);
            }
        }, this);
        panel.addChild(manualToolBtn);

        // Edit Box Background
        var editBg = new cc.LayerColor(cc.color(255, 255, 255, 255), panel.width - 240, 40);
        editBg.setPosition(20, 30);
        panel.addChild(editBg);

        // Input Field
        this.inputBox = new cc.EditBox(cc.size(panel.width - 240, 40), new cc.Scale9Sprite());
        this.inputBox.setPosition(20 + editBg.width / 2, 30 + editBg.height / 2);
        this.inputBox.setFontSize(20);
        this.inputBox.setFontColor(cc.color.BLACK);
        this.inputBox.setPlaceHolder("Type your message to Gemini...");
        this.inputBox.setPlaceholderFontColor(cc.color.GRAY);
        this.inputBox.setMaxLength(2000);
        this.inputBox.setReturnType(cc.KEYBOARD_RETURNTYPE_SEND);
        panel.addChild(this.inputBox);

        // Send Button
        var sendBtn = new ccui.Button();
        sendBtn.setTitleText("Send");
        sendBtn.setTitleFontSize(24);
        sendBtn.setTitleColor(cc.color.WHITE);

        var sendBg = new cc.LayerColor(cc.color(0, 120, 255, 255), 100, 40);
        sendBg.setPosition(panel.width - 120, 30);
        panel.addChild(sendBg);

        sendBtn.setPosition(panel.width - 70, 50);
        sendBtn.addTouchEventListener(function (sender, type) {
            if (type === ccui.Widget.TOUCH_ENDED) {
                this.sendMessage();
            }
        }, this);
        panel.addChild(sendBtn);

        // To handle continuous layout updates
        this.conversationText = "";
    },

    fetchAvailableModels: function () {
        var apiKey = this.apiKeyInput.getString().trim() || fr.UserData.getStringFromKey("GEMINI_API_KEY", "");
        if (!apiKey) return;

        var self = this;
        var url = "http://localhost:5000/api/models?api_key=" + apiKey + "&provider=" + this.PROVIDER;

        var xhr = cc.loader.getXMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    if (response.models && response.models.length > 0) {
                        self.availableModels = response.models;
                        if (self.availableModels.indexOf(self.MODEL) === -1) {
                            self.MODEL = self.availableModels[0];
                            self.modelBtn.setTitleText(self.MODEL);
                        }
                    }
                } catch (e) {
                    cc.log("Error parsing models:", e.message);
                }
            }
        };
        xhr.onerror = function () { cc.log("Failed to fetch models"); };
        xhr.send();
    },

    appendMessage: function (sender, message) {
        if (this.conversationText.length > 0) {
            this.conversationText += "\n\n";
        }
        var msgToAppend = sender + ": " + message;
        this.conversationText += msgToAppend;

        this.updateChatLayout();

        // Scroll to bottom
        this.scrollView.scrollToBottom(0.1, false);
    },

    removeTypingIndicator: function () {
        this.stopTypingAnimation();
        var typingStr = "\n\nGemini: Running Local Agent Tools...";
        if (this.conversationText.endsWith(typingStr)) {
            this.conversationText = this.conversationText.substring(0, this.conversationText.length - typingStr.length);
        } else if (this.conversationText.startsWith("Gemini: Running Local Agent Tools")) {
            this.conversationText = "";
        }
        this.updateChatLayout();
    },

    startTypingAnimation: function () {
        this._typingDots = 0;
        this._typingBaseText = this.conversationText.replace(/Running Local Agent Tools\.*/g, "Running Local Agent Tools");
        var self = this;
        this.schedule(function () {
            self._typingDots = (self._typingDots + 1) % 4;
            var dots = "";
            for (var i = 0; i < self._typingDots; i++) dots += ".";
            // Replace last occurrence of the typing indicator
            var base = self._typingBaseText;
            self.conversationText = base + dots;
            self.updateChatLayout();
            self.scrollView.scrollToBottom(0.1, false);
        }, 0.5, cc.REPEAT_FOREVER, 0, "typingAnim");
    },

    stopTypingAnimation: function () {
        this.unschedule("typingAnim");
    },

    updateChatLayout: function () {
        this.chatText.setString(this.conversationText);

        // LabelTTF auto-calculates its dimensions based on the text and the fixed width
        var textSize = this.chatText.getContentSize();

        // Ensure inner container is at least the scrollView height
        var minHeight = this.scrollView.height;
        var innerHeight = Math.max(minHeight, textSize.height + 20);

        this.scrollView.setInnerContainerSize(cc.size(this.scrollView.width, innerHeight));

        // Positioning text from Top
        this.chatText.setPosition(10, innerHeight - 10);
    },

    startNewChat: function () {
        this.chatHistory = [];
        this.conversationText = "";
        this.updateChatLayout();
        this.appendMessage("System", "Started a new conversation session.");
        this.inputBox.setString("");
    },

    sendMessage: function () {
        var text = this.inputBox.getString().trim();
        if (!text) return;

        var apiKey = this.apiKeyInput.getString().trim();
        if (!apiKey) {
            this.appendMessage("System", "Please enter your Gemini API Key at the top.");
            return;
        }

        // Save the API key for next time
        fr.UserData.setStringFromKey("GEMINI_API_KEY", apiKey);

        this.inputBox.setString("");
        this.appendMessage("You", text);
        this.appendMessage("Gemini", "Requesting Agent Task...");
        this.startTypingAnimation();

        var self = this;
        var url = "http://localhost:5000/api/chat";

        // Save user message to history
        this.chatHistory.push({
            "role": "user",
            "parts": [{ "text": text }]
        });

        // 1. Send the initial request to start the task
        var xhr = cc.loader.getXMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        var response = JSON.parse(xhr.responseText);
                        if (response.task_id) {
                            self.appendMessage("Gemini", "Agent is thinking... (Polling local server)");
                            self.startPolling(response.task_id);
                        } else {
                            self.removeTypingIndicator();
                            self.appendMessage("System", "Error: No task_id returned from server.");
                        }
                    } catch (e) {
                        self.removeTypingIndicator();
                        self.appendMessage("System", "Error parsing initial response: " + e.message);
                    }
                } else {
                    self.removeTypingIndicator();
                    self.appendMessage("System", "HTTP Error (Start Task): " + xhr.status + "\n" + xhr.responseText);
                }
            }
        };

        xhr.onerror = function () {
            self.removeTypingIndicator();
            self.appendMessage("System", "Network Error: Could not connect to local server.");
        };

        var body = JSON.stringify({
            "api_key": apiKey,
            "provider": this.PROVIDER,
            "model": this.MODEL,
            "system_instruction": {
                "parts": [{ "text": "You are a Match-3 Block Designer AI Agent. Help the user design and generate blockData JSON for their game." }]
            },
            "contents": this.chatHistory
        });

        xhr.send(body);
    },

    startPolling: function (taskId) {
        var self = this;
        var pollUrl = "http://localhost:5000/api/task_status/" + taskId;

        var pollInterval = setInterval(function () {
            var xhr = cc.loader.getXMLHttpRequest();
            xhr.open("GET", pollUrl, true);

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            var response = JSON.parse(xhr.responseText);
                            if (response.status === "completed") {
                                clearInterval(pollInterval);
                                self.handleAgentResult(response.result);
                            } else if (response.status === "error") {
                                clearInterval(pollInterval);
                                self.removeTypingIndicator();
                                self.appendMessage("System", "Agent Error: " + (response.error || "Unknown error"));
                            }
                            // If "pending", do nothing and wait for next interval
                        } catch (e) {
                            clearInterval(pollInterval);
                            self.removeTypingIndicator();
                            self.appendMessage("System", "Error parsing poll response: " + e.message);
                        }
                    } else {
                        clearInterval(pollInterval);
                        self.removeTypingIndicator();
                        self.appendMessage("System", "Poll failed with status: " + xhr.status);
                    }
                }
            };

            xhr.onerror = function () {
                clearInterval(pollInterval);
                self.removeTypingIndicator();
                self.appendMessage("System", "Network Error during polling.");
            };

            xhr.send();
        }, 2000);
    },

    handleAgentResult: function (response) {
        this.removeTypingIndicator();

        if (response.candidates && response.candidates.length > 0) {
            var reply = response.candidates[0].content.parts[0].text;
            this.appendMessage("Gemini", reply);

            // Save assistant reply to history
            this.chatHistory.push({
                "role": "model",
                "parts": [{ "text": reply }]
            });

            // Check if reply is a valid JSON and Try to Parse it as BlockData
            try {
                var parsedData = JSON.parse(reply);
                if (parsedData.type || parsedData.visual) {
                    this.appendMessage("System", "Agent successfully generated and saved the BlockData.");
                }
            } catch (e) {
                // Not a valid json, do nothing
            }
        } else {
            this.appendMessage("System", "Received empty response from Gemini.");
        }
    }
});

GeminiDialog.show = function (onClose) {
    var scene = cc.director.getRunningScene();
    if (!scene) return null;

    // Create and add dialog on top
    var dialog = new GeminiDialog();
    dialog.setName("GeminiDialog");
    if (typeof onClose === 'function') {
        dialog.onCloseCallback = onClose;
    }
    scene.addChild(dialog, 9999);
    return dialog;
};
