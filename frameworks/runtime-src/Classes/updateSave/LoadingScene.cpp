#include "LoadingScene.h"
#include "AppDelegate.h"
#include "ScriptingCore.h"
#include "update/NativeBridge.h"
#include "update/DialogUI.h"
#include "update/CCLocalizedString.h"
#include "baseframework/BaseFramework.h"
#include "storage/local-storage/LocalStorage.h"
#include "DragonBones.h"
#include "renderer/DBCCFactory.h"
#include "cocos2d.h"
#include "ide-support/CodeIDESupport.h"
#include "audio/include/SimpleAudioEngine.h"

#if (CC_TARGET_PLATFORM == CC_PLATFORM_ANDROID)
#include <jni.h>
#include "platform/android/jni/JniHelper.h"
#include "platform/CCCommon.h"
#elif(CC_TARGET_PLATFORM == CC_PLATFORM_IOS)
#include "PlatformWrapper.h"
#include "IOSConnection.h"
#else

#endif
using namespace CocosDenshion;
using namespace dragonBones;
using namespace cocos2d::network;


#if (COCOS2D_DEBUG > 0) && (CC_CODE_IDE_DEBUG_SUPPORT > 0)
#include "runtime/Runtime.h"
#include "ide-support/RuntimeJsImpl.h"
#else
#include "js_module_register.h"
#endif

#define NUM_DOT  42

// variable
string store_url = "";
int updateJS = 1;

// function 
void closeGame()
{
#if CC_TARGET_PLATFORM == CC_PLATFORM_IOS
	exit(0);
#else
	Director::getInstance()->end();
#endif
}

void updateGame()
{
	cocos2d::log("__OPEN__STORE___ %s", store_url.c_str());

	NativeBridge::openURLNative(store_url);
	closeGame();
}

// LOADING 
LoadingGUI *LoadingGUI::_inst = NULL;

void LoadingGUI::initUI()
{
	auto size = Director::getInstance()->getWinSize();
	float _scale = size.width / 800;
	_scale = (_scale > 1) ? 1 : _scale;

	// BG LOADING 
	intro = Sprite::create("res/Lobby/Common/gamecenter.png");
	intro->setScaleX(size.width / intro->getContentSize().width);
	intro->setScaleY(size.height / intro->getContentSize().height);
	addChild(intro);
	intro->setPosition(size.width / 2, size.height / 2);
	intro->setLocalZOrder(100);

	auto bg = Sprite::create("res/Lobby/Common/bgLoading.jpg");
 	bg->setScaleX(size.width / bg->getContentSize().width);
 	bg->setScaleY(size.height / bg->getContentSize().height);
	//bg->setScale(_scale);
	addChild(bg);
	bg->setPosition(size.width / 2, size.height / 2);

	auto icon = Sprite::create("res/Lobby/LoginGUI/icon.png");
	icon->setScale(_scale);
	icon->setPosition(size.width / 2, size.height / 2 - icon->getContentSize().height*0.125f);

	auto logo = Sprite::create("res/common/gametitle.png");
	addChild(logo);
	logo->setScale(_scale);
	logo->setPosition(icon->getPositionX() - logo->getContentSize().width*_scale*0.035f,icon->getPositionY() + logo->getContentSize().height*_scale*0.275);
	logo->setLocalZOrder(99); 

	// Load animation 
	DBCCFactory::getInstance()->loadDragonBonesData("res/Armatures/LogoLarge/skeleton.xml", "LogoLarge");
	DBCCFactory::getInstance()->loadTextureAtlas("res/Armatures/LogoLarge/texture.plist", "LogoLarge");

	DBCCArmatureNode *effIcon = DBCCFactory::getInstance()->buildArmatureNode("LogoLarge");
	if (effIcon)
	{
		addChild(effIcon);
		effIcon->setPosition(icon->getPosition());
		effIcon->setScale(_scale);
		effIcon->getAnimation()->gotoAndPlay("1", -1, -1, 0);
	}

	// BAR LOADING 
	auto bar = Sprite::create("res/Lobby/LoginGUI/bar.png");
	bar->setScale(_scale);
	bar->setPosition(size.width / 2, icon->getPositionY() - icon->getContentSize().height/2 - bar->getContentSize().height*1.25f);
	addChild(bar);

	dots = new vector<Sprite*>();
	float sX = 17;
	float sY = bar->getContentSize().height / 2;
	for (int i = 0; i < NUM_DOT; i++)
	{
		auto dot = Sprite::create("res/Lobby/LoginGUI/dot.png");
		bar->addChild(dot);
		dot->setVisible(false);
		dot->setPosition(sX + i*dot->getContentSize().width*1.15f, sY);
		dots->push_back(dot);

		if (i == 0)
		{
			curPos = dot->getPosition();
		}
	}

	light = Sprite::create("res/Lobby/LoginGUI/light.png");
	bar->addChild(light);
	light->setVisible(false);

	// TEXT LOADING 
	lbVersion = Text::create("1.0","res/fonts/tahoma.ttf",17);
	lbVersion->setTextHorizontalAlignment(TextHAlignment::LEFT);
	lbVersion->setTextColor(Color4B(203, 204, 206, 255));
	lbVersion->setAnchorPoint(Vec2(0, 0.5));
	addChild(lbVersion);
	lbVersion->setScale(_scale);
	lbVersion->setPosition(Vec2(10, lbVersion->getContentSize().height));

	lbUpdate = Text::create("", "res/fonts/tahoma.ttf", 17);
	lbUpdate->setTextHorizontalAlignment(TextHAlignment::CENTER);
	lbUpdate->setTextColor(Color4B(203, 204, 206, 255));
	addChild(lbUpdate);
	lbUpdate->setScale(_scale);
	lbUpdate->setPosition(Vec2(size.width/2, bar->getPositionY() + bar->getContentSize().height/1.8f));

	// init storage
	std::string strFilePath = cocos2d::FileUtils::getInstance()->getWritablePath();
	strFilePath += "/jsb.sqlite";
	localStorageInit(strFilePath.c_str());

	// start 
	SimpleAudioEngine::getInstance()->playEffect("Armatures/ZpBrand/zp_indent.mp3");
	intro->setVisible(false);
	loadOldVersionUserDefault();
	loadCheckGameUpdateStore();
	skeletonNode = SkeletonAnimation::createWithFile("Armatures/ZpBrand/zp_indent.json", "Armatures/ZpBrand/zp_indent.atlas", 1.0f);
	skeletonNode->setAnimation(0, "run", false);
	skeletonNode->update(0);
	skeletonNode->setLocalZOrder(100);
	//skeletonNode->setAnimation(1, "empty", false);
	//skeletonNode->addAnimation(1, "gungrab", false, 2);
	//skeletonNode->setScale(0.5);

	cocos2d::log("CONTENT SIZE ******** %f %f ", skeletonNode->getBoundingBox().size.width, skeletonNode->getBoundingBox().size.height);
	float rate2 = skeletonNode->getBoundingBox().size.width / skeletonNode->getBoundingBox().size.height;
	float rate1 = size.width / size.height;
	float scale;
	if (rate1 > rate2) {
		scale = 1 / (skeletonNode->getBoundingBox().size.width / size.width);
	}
	else {
		scale = 1 / (skeletonNode->getBoundingBox().size.height / size.height);
	}
	skeletonNode->setScale(scale);
	skeletonNode->setPosition(Vec2(size.width / 2, size.height * 0.5));
	addChild(skeletonNode);
	introGame();
}

void LoadingGUI::initDownloader()
{
	std::string storagePath = fr::NativeService::getFolderUpdateAssets();

	_am = AssetsManagerEx::create("project.manifest", storagePath);
	_am->retain();

	onLoadJSVersion();
}

void LoadingGUI::introGame()
{
	loadOldVersionUserDefault();
	loadCheckGameUpdateStore();

	bool isIntro = false;
#if (CC_TARGET_PLATFORM == CC_PLATFORM_ANDROID || CC_TARGET_PLATFORM == CC_PLATFORM_WIN32)
	intro->setVisible(true);
	isIntro = true;
#else
	intro->setVisible(false);
	isIntro = false;
#endif

	cocos2d::log("introGame: " + isIntro);

	if (isIntro)
	{
		this->runAction(Sequence::create(DelayTime::create(3.0f), CallFunc::create(CC_CALLBACK_0(LoadingGUI::checkNoNetwork, this)), NULL));
		intro->runAction(Sequence::create(DelayTime::create(4.0f), Spawn::create(FadeOut::create(4.0f), ScaleTo::create(4.0f, 5), NULL), RemoveSelf::create(), NULL));
	}
	else
	{
		checkNoNetwork();
	}
}

void LoadingGUI::loadOldVersionUserDefault()
{
	UserDefault *userDefault = UserDefault::getInstance();

	bool isNew = userDefault->getBoolForKey(GameConfig("KEY_LOAD_NEW_VERSION").c_str(), false);
	if (!isNew)
	{
		userDefault->setBoolForKey(GameConfig("KEY_LOAD_NEW_VERSION").c_str(), true);

		string zName = userDefault->getStringForKey(GameConfig("KEY_USERNAME_OLD").c_str(), "");
		string zPwd = userDefault->getStringForKey(GameConfig("KEY_PASSWORD_OLD").c_str(), "");
		int autoLogin = userDefault->getIntegerForKey(GameConfig("KEY_LOGIN_OLD").c_str(), -10);

		string sLogin = StringUtils::format("%d", autoLogin);

		localStorageSetItem(GameConfig("KEY_USERNAME_NEW").c_str(), zName);
		localStorageSetItem(GameConfig("KEY_PASSWORD_NEW").c_str(), zPwd);
		localStorageSetItem(GameConfig("KEY_LOGIN_NEW").c_str(), sLogin);

		userDefault->setStringForKey(GameConfig("KEY_USERNAME_OLD").c_str(), "");
		userDefault->setStringForKey(GameConfig("KEY_PASSWORD_OLD").c_str(), "");
		userDefault->setIntegerForKey(GameConfig("KEY_LOGIN_OLD").c_str(), -10);
	}
}

void LoadingGUI::loadCheckGameUpdateStore()
{
	string updateIap = "";
	localStorageGetItem("game_update_iap", &updateIap);

	if (updateIap.compare("1") != 0)
	{
		bool isUpdateGame = true;

		string versioncode = "";
		localStorageGetItem("versioncode", &versioncode);

		if (versioncode.compare("") == 0)
		{
			isUpdateGame = false;
		}
		else
		{
			int iVersion = atoi(versioncode.c_str());
			isUpdateGame = (iVersion < VERSION_CHECK_UPDATE);
		}

		if (isUpdateGame)
		{
			localStorageSetItem("game_update_iap", "1");
			cocos2d::log("LoadingScene::Game is update - from old version");
		}
		else
		{
			localStorageRemoveItem("game_update_iap");
			cocos2d::log("LoadingScene::Game is not update");
		}
	}
	else
	{
		cocos2d::log("LoadingScene::Game is update - from cache");
	}

}

void LoadingGUI::checkNewAPK()	{
	cocos2d::log("____CHECK___NEW___APK_____");

	lbUpdate->setString(CCLocalizedString("CHECK_UPDATE_JS"));

	string currentversioncode = NativeBridge::getVersionCode();
	string versioncode = "";
	localStorageGetItem("versioncode", &versioncode);

	if (versioncode == "")
	{
		localStorageSetItem("versioncode", currentversioncode);
	}
	else
	{
		if (currentversioncode != versioncode)
		{
			localStorageSetItem("versioncode", currentversioncode);
			std::string storagePath = fr::NativeService::getFolderUpdateAssets();
			unsigned long found = storagePath.find_last_of("/\\");
			if (found < storagePath.length() - 1)
			{
				storagePath += "/";
			}

			if (FileUtils::getInstance()->removeDirectory(storagePath))
			{
				cocos2d::log("_____DELETE___UPDATE___FOLDER___SUCCESS__________");
			}
			else
			{
				cocos2d::log("_____DELETE___UPDATE___FOLDER___FAILED__________");
			}
		}
	}
}

void LoadingGUI::checkAppversion() {
	std::string APP_VERSION = NativeBridge::getGameVersion();
	cocos2d::log("____CHECK___APP___VERSION_____%s", APP_VERSION.c_str());

	localStorageSetItem(GameConfig("KEY_DATA_URL").c_str(), "");
	localStorageSetItem(GameConfig("KEY_APP_VERSION").c_str(), APP_VERSION);

	cRequest = new HttpRequest();
	cRequest->setTag("CHECK APP_VERSION");
	cRequest->setUrl(APP_VERSION_URL.c_str());
	cRequest->setRequestType(HttpRequest::Type::POST);
	cRequest->setResponseCallback(CC_CALLBACK_2(LoadingGUI::httpCallback, this));

	string data = "game=";

#if CC_TARGET_PLATFORM == CC_PLATFORM_ANDROID
	data += GameConfig("GAME_ANDROID");
#elif CC_TARGET_PLATFORM == CC_PLATFORM_IOS
	data += GameConfig("GAME_IOS");
#elif CC_TARGET_PLATFORM == CC_PLATFORM_WP8
	data += GameConfig("GAME_WP");
#else
	data += GameConfig("GAME_ANDROID");
#endif

	std::string jsVersion = "";
	localStorageGetItem(GameConfig("KEY_JS_VERSION"), &jsVersion);
	if (jsVersion == "") jsVersion = "0";

	data += "&device=" + NativeBridge::getDeviceID() + "&version=" + APP_VERSION + "&jsversion=" +jsVersion;
	data += "&referer=" + NativeBridge::getRefer();

	//cocos2d::log("________ %s?%s",APP_VERSION_URL.c_str(), data.c_str());

	cRequest->setRequestData(data.c_str(), data.size());
	HttpClient::getInstance()->setTimeoutForRead(10);
	HttpClient::getInstance()->send(cRequest);
	cRequest->release();
	cRequest = NULL;
}

void LoadingGUI::httpCallback(HttpClient* client, HttpResponse* response){
	cocos2d::log("____RESPONSE____APP_VERSION_SERVICE_____");

	HandlerManager::getInstance()->forceRemoveHandler("check_appversion");
	if (!response || !response->isSucceed())
	{
		checkUpdateJS();
		return;
	}

	cocos2d::log("%s is completed", response->getHttpRequest()->getTag());

	std::vector<char> *buffer = response->getResponseData();
	std::string result(buffer->begin(), buffer->end());

	localStorageSetItem(GameConfig("KEY_DATA_URL").c_str(), result);

	cocos2d::log("___AppVersionFromServices : %s", result.c_str());

	if (result.find_first_of("{") == 0)	
	{
		rapidjson::Document d;
		d.Parse<0>(result.c_str());

// 		if (d.HasMember("enable_gsntracker"))
// 		{
// 			NativeBridge::enableGSNLog(d["enable_gsntracker"].GetInt() == 1);
// 		}
// 		else
// 		{
// 			NativeBridge::enableGSNLog(true);
// 		}

		if (d.HasMember("maintain"))
		{
			int maintain = d["maintain"].GetInt();
			if (maintain == 1)
			{
				string msg_maintain = "";
				if (d.HasMember("mess_maintain"))
					msg_maintain = d["mess_maintain"].GetString();
				if (msg_maintain.compare("") == 0)
				{
					msg_maintain = CCLocalizedString("SYSTEM_MAINTANCE");
				}
				DialogGUI::create(this,msg_maintain, 1, &closeGame);
				return;
			}
		}
		if (d.HasMember("update_link"))
		{
			store_url = d["update_link"].GetString();
		}

		int update = d["update"].GetInt();
		if (d.HasMember("updatejs"))
		{
			updateJS = d["updatejs"].GetInt();
		}
		else
		{
			updateJS = 1;
		}

		switch (update)
		{
			case 2: // Update available , can skip update
			{
				std::string mess = "";
				if (d.HasMember("update_message"))
				{
					mess = d["update_message"].GetString();
				}
				if (mess.compare("") == 0)
				{
					mess = CCLocalizedString("NEW_VERSION_UPDATE_NOTIFY");
				}

				DialogGUI::create(this, mess, 2, &updateGame, CC_CALLBACK_0(LoadingGUI::startUpdateJS,this));

				break;
			}
			case 1:	// Update available , need update
			{
				std::string mess = "";
				if (d.HasMember("update_message"))
				{
					mess = d["update_message"].GetString();
				}
				if (mess.compare("") == 0)
				{
					mess = CCLocalizedString("NEW_VERSION_UPDATE_NOTIFY");
				}

				DialogGUI::create(this, mess, 1, &updateGame);

				break;
			}
			default:
			{
				checkUpdateJS();
				break;
			}
		}
	}
	else
	{
		checkUpdateJS();
	}
}

void LoadingGUI::checkUpdateJS(bool retry){
	bool isUpdateJS = true;
	if (!retry)
	{
		if (updateJS != 1) isUpdateJS = false;
	}

	if (!isUpdateJS)
	{
		skipUpdate();
		return;
	}

	//if (!retry) NativeBridge::logLoadStart();

	cocos2d::log("______START___UPDATE___JS______");
	isWaitingDownload = true;
	
	// Loading 
	lbUpdate->setString(CCLocalizedString("PROCESS_UPDATE_JS"));

	curDot = 0;
	for (int i = 0; i < NUM_DOT; i++)
	{
		dots->at(i)->setVisible(false);
		dots->at(i)->cleanup();
	}

	// Download Listener 
	if (!_am->getLocalManifest()->isLoaded())
	{
		cocos2d::log("Fail to update assets, step skipped.");
		//NativeBridge::logUpdateError("lolca_manifest_load_fail");
		//skipUpdate();
		onLoadEnd(false); 
	}
	else
	{
		cocos2d::log("Start download file from server.");

		std::string version = _am->getLocalManifest()->getVersion();
		fr::FrameworkDelegate::getInstance()->setJSVersion(version);

		//int testIndex = _testIndex;
		_amListener = cocos2d::extension::EventListenerAssetsManagerEx::create(_am, [this](EventAssetsManagerEx* event){
			static int failCount = 0;
			string eventMsg = StringUtils::format("%d_%s_%s_", event->getEventCode(),event->getAssetId().c_str(),event->getMessage().c_str());
			switch (event->getEventCode())
			{
			case EventAssetsManagerEx::EventCode::ERROR_NO_LOCAL_MANIFEST:
			{
				cocos2d::log("No local manifest file found, skip assets update.");
				//NativeBridge::logUpdateError(eventMsg.append("no_local_manifest_found"));
				//this->onLoadEnd(false);
				//skipUpdate();
				onLoadEnd(false);
				break;
			}
			case EventAssetsManagerEx::EventCode::UPDATE_PROGRESSION:
			{
				if (event->getAssetsManagerEx()->getTotalToDownload() > 0)
				{
					this->updateDownload(event->getAssetsManagerEx()->getTotalToDownload() - event->getAssetsManagerEx()->getTotalWaitToDownload(), event->getAssetsManagerEx()->getTotalToDownload());
				}
				break;
			}
			case EventAssetsManagerEx::EventCode::ERROR_DOWNLOAD_MANIFEST:
			case EventAssetsManagerEx::EventCode::ERROR_PARSE_MANIFEST:
			{
				cocos2d::log("Fail to download manifest file, update skipped.");
				//NativeBridge::logUpdateError(eventMsg.append("download_manifest_fail"));
				//this->onLoadEnd(false);
				//skipUpdate();
				onLoadEnd(false);
				break;
			}
			case EventAssetsManagerEx::EventCode::ALREADY_UP_TO_DATE:
			{
				cocos2d::log("Update finished. %s", event->getMessage().c_str());
				this->onLoadEnd();
				break;
			}
			case EventAssetsManagerEx::EventCode::UPDATE_FINISHED:
			{
				std::string version = _am->getLocalManifest()->getVersion();
				fr::FrameworkDelegate::getInstance()->setJSVersion(version);
				cocos2d::log("Update finished. %s", event->getMessage().c_str());
				this->onLoadEnd();
				break;
			}
			case EventAssetsManagerEx::EventCode::UPDATE_FAILED:
			{
				cocos2d::log("Update failed. %s", event->getMessage().c_str());

				failCount++;
				if (failCount < 5)
				{
					_am->downloadFailedAssets();
				}
				else
				{
					//NativeBridge::logUpdateError(eventMsg.append("_maximum_download_file"));

					cocos2d::log("Reach maximum fail count, exit update process");
					failCount = 0;
					this->onLoadEnd(false);
				}
				break;
			}
			case EventAssetsManagerEx::EventCode::ERROR_UPDATING:
			{
				cocos2d::log("Asset %s : %s", event->getAssetId().c_str(), event->getMessage().c_str());
				break;
			}
			case EventAssetsManagerEx::EventCode::ERROR_DECOMPRESS:
			{
				//NativeBridge::logUpdateError(eventMsg);
				cocos2d::log("%s", event->getMessage().c_str());
				break;
			}
			case EventAssetsManagerEx::EventCode::ERROR_LOST_CONNECTION:
			{
				failCount = 0;
				this->onLoadEnd(false);
				break;
			}
			default:
				break;
			}
		});

		Director::getInstance()->getEventDispatcher()->addEventListenerWithFixedPriority(_amListener, 1);
		_am->update();
	}
}

void LoadingGUI::checkNoNetwork() {
	cocos2d::log("____CHECK_NETWORK_____");

	bool networkstatus = NativeBridge::checkNetwork();
	if (networkstatus)
	{
		checkNewAPK();
		checkAppversion();

		// init download
		initDownloader();
	}
	else
	{
		DialogGUI::create(this, CCLocalizedString("CHECK_NETWORK"),1, &closeGame);
	}
}

void LoadingGUI::onLoadEnd(bool success)
{
	onLoadJSVersion();

	if (_amListener != NULL)
	{
		Director::getInstance()->getEventDispatcher()->removeEventListener(_amListener);
		_amListener = NULL;
	}

	if (_am != NULL)
	{
		_am->release();
		_am = NULL;
	}

	isWaitingDownload = false;

	if (success)
	{
		this->isSkipUpdate = false;
		this->onStartGame();
	}
	else
	{
		this->isSkipUpdate = true;
		DialogGUI::create(this, CCLocalizedString("UPDATE_JS_FAILED"),1, CC_CALLBACK_0(LoadingGUI::retryUpdateJS, this));
	}
}

void LoadingGUI::updateDownload(int cur, int total)
{
	string message = CCLocalizedString("PROCESS_UPDATE_JS");
	message += CCString::createWithFormat(" (%d/%d)", cur, total)->getCString();

	if (lbUpdate != nullptr)
		lbUpdate->setString(message);

	float per = cur*1.0 / total;
	int dot = (int)(per*NUM_DOT) - 1;

	if (dot <= curDot) return;

	if (dot > curDot && dot < NUM_DOT)
	{
		for (int i = curDot; i < dot; i++)
		{
			Sprite* item = dots->at(i);

			item->setVisible(true);
			item->setScale(1);

			//item->runAction(Sequence::create(DelayTime::create(0.1f*i), ScaleTo::create(0.2f, 3.0f), ScaleTo::create(0.15f, 1.0f), NULL));
		}

		light->setVisible(cur < total);
		//light->cleanup();
		//light->setPosition(curPos);
		//light->runAction(MoveTo::create(0.2f, dots->at(dot)->getPosition()));
		//curPos = dots->at(dot)->getPosition();
		light->setPosition(dots->at(dot)->getPosition());
	}
	else
	{
		light->setVisible(false);
	}

	curDot = dot;
}

void LoadingGUI::startUpdateJS()
{
	checkUpdateJS(false);
}

void LoadingGUI::retryUpdateJS()
{
	initDownloader();
	checkUpdateJS(true);
}

void LoadingGUI::onStartGame()
{
	//NativeBridge::logLoadSuccess(this->isSkipUpdate);

	isFinishLoaded = true;

	updateDownload(1, 1);
	lbUpdate->setString(CCLocalizedString("UPDATE_JS_FINISH"));

	this->runAction(Sequence::create(DelayTime::create(0.5f), CallFunc::create(CC_CALLBACK_0(LoadingGUI::runScript, this)), NULL));
}

void LoadingGUI::onLoadJSVersion()
{
	bool versionDone = false;
	std::string str = "";

	if (_am != NULL)
	{
		if (_am->getLocalManifest() != NULL)
		{
			str = _am->getLocalManifest()->getVersion();
			versionDone = true;
		}
	}

	if (!versionDone)
	{
		str = "0";
	}

	localStorageSetItem(GameConfig("KEY_JS_VERSION"), str);
	cocos2d::log("________________JS___VERSION___%s", str.c_str());
	this->lbVersion->setString(NativeBridge::getVersionString().c_str());
}

void LoadingGUI::skipUpdate()
{
	onLoadJSVersion();

	if (_amListener != NULL)
	{
		Director::getInstance()->getEventDispatcher()->removeEventListener(_amListener);
		_amListener = NULL;
	}

	if (_am != NULL)
	{
		_am->release();
		_am = NULL;
	}

	isWaitingDownload = false;

	this->isSkipUpdate = false;
	this->onStartGame();
}

void LoadingGUI::runScript()
{
#if (COCOS2D_DEBUG > 0) && (CC_CODE_IDE_DEBUG_SUPPORT > 0)
#else
	js_module_register();
	ScriptingCore* sc = ScriptingCore::getInstance();
	sc->start();
	sc->runScript("script/jsb_boot.js");
#if defined(COCOS2D_DEBUG) && (COCOS2D_DEBUG > 0)
	sc->enableDebugger();
#endif
	ScriptEngineProtocol *engine = ScriptingCore::getInstance();
	ScriptEngineManager::getInstance()->setScriptEngine(engine);
	ScriptingCore::getInstance()->runScript("main.js");
#endif
}