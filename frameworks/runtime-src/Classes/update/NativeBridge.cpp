#include "NativeBridge.h"
#include "cocos2d.h"
#include <string>
#include "update/CCLocalizedString.h"
#include "extensions/cocos-ext.h"
#include "storage/local-storage/LocalStorage.h"
#include "baseframework/framework/platform/NativeService.h"
#include "baseframework/framework/FrameworkDelegate.h"

using namespace std;
using namespace cocos2d;
using namespace fr;

std::string NativeBridge::getDeviceID()
{
	return fr::NativeService::getDeviceID();
}

std::string NativeBridge::getRefer()
{
	return fr::NativeService::getRefer();
}

std::string NativeBridge::getVersionString()
{
	int versionCode = fr::NativeService::getVersionCode();
	std::string versionName = fr::NativeService::getAppVersion();

	std::string versionGame = fr::NativeService::getGameVersion();

	std::string versionJS = "";
	localStorageGetItem(GameConfig("KEY_JS_VERSION"), &versionJS);

	char str[30];
	sprintf(str, "v%s.%d.%s.%s",versionName.c_str(), versionCode,versionGame.c_str(),versionJS.c_str());

	return std::string(str);
}

std::string NativeBridge::getVersionCode()
{
	int v = fr::NativeService::getVersionCode();
	char str[9];
	sprintf(str, "%d", v);
	return std::string(str);
}

std::string NativeBridge::getGameVersion()
{
	return fr::NativeService::getGameVersion();
}

void NativeBridge::openURLNative(string url)
{
	fr::NativeService::openURL(url);
}

bool NativeBridge::checkNetwork()
{
	return fr::NativeService::checkNetwork();
}
