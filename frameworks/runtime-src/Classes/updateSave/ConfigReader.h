#ifndef ClientConfig_h__
#define ClientConfig_h__

#include "cocos2d.h"
#include <vector>
#include <string>

namespace tinyxml2
{
	class XMLElement;
}

class ConfigReader
{
public:
	std::vector<std::string> searchPathsPriority;
	std::vector<std::string> searchPathsJS;

	std::string urlService;
	std::string updateFolder;

	std::string fontName;
	cocos2d::Color4B fontColor;
	int fontSize;

	std::string loadingBg;
	std::string loadingBar;
	std::string loadingBgBar;
	std::string loadingBgBot;
	std::string loadingGirl;
	float loadingBarHeightPercent;
	float loadingBgBotHeightPercent;

	std::string introJSON;
	std::string introAtlas;
	std::string introKey;
	std::string introSound;
	float introTimePlay;
	float introTimeHide;
	float introScale;

	std::string dialogBg;
	std::string dialogTitle;
	std::string dialogBtnOK;
	std::string dialogBtnCancel;
	cocos2d::Color4B dialogTextColor;

	int resolutionWidth;
	int resolutionHeight;
	int resolutionPolicy;

	~ConfigReader();
	static ConfigReader* getInstance();
	static void destroyInstance();

	void addSearchPath(std::string downloadPath);

private:
	ConfigReader();

	void loadData();
	void loadDefault();

	static ConfigReader* _configReader;
};
#endif // ClientConfig_h__
