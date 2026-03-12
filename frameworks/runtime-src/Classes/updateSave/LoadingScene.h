#ifndef IntroScene_h__
#define IntroScene_h__

#include "cocos2d.h"
#include "extensions/cocos-ext.h"
#include "network/HttpRequest.h"
#include "engine/AsyncDownloader.h"
#include <stdlib.h>
#include <ctype.h>
#include "engine/Handler.h"
#include "CCLocalizedString.h"
#include "cocos/ui/CocosGUI.h"
#include "Var.h"
#include <spine/spine-cocos2dx.h>
USING_NS_CC;
USING_NS_CC_EXT;

#include <string>
#include <vector>

using namespace std;
using namespace ui;
using namespace spine;
class LoadingGUI : public Layer
{
private:
	static LoadingGUI *_inst;

public:
	AssetsManagerEx* _am;
	EventListenerAssetsManagerEx* _amListener;
	cocos2d::network::HttpRequest* cRequest;

	Sprite *intro;
	SkeletonAnimation* skeletonNode;
	Text *lbUpdate;
	Text *lbVersion;

	vector<Sprite*> *dots;
	Sprite *light;
	int curDot = 0;
	Vec2 curPos;

	bool isFinishLoaded;
	bool isWaitingDownload;
	bool isSkipUpdate;

	LoadingGUI() : Layer()
	{
		isFinishLoaded = false;
		isWaitingDownload = false;
		isSkipUpdate = false;

		initUI();
	}

	void initUI();
	void introGame();
	void initDownloader();
	void loadOldVersionUserDefault();
	void loadCheckGameUpdateStore();
	void checkNewAPK();
	void checkAppversion();
	void httpCallback(cocos2d::network::HttpClient* client, cocos2d::network::HttpResponse* response);

	void startUpdateJS();
	void retryUpdateJS();
	void checkUpdateJS(bool retry = false);
	void checkNoNetwork();

	void updateDownload(int cur, int total);

	void onLoadEnd(bool success = true);
	void skipUpdate();
	void onStartGame();
	void runScript();

	void onLoadJSVersion();

	static LoadingGUI *instance()
	{
		if (_inst == NULL)
		{
			_inst = new LoadingGUI();
		}

		return _inst;
	}
};

#endif // IntroScene_h__

