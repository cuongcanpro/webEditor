#include "ConfigReader.h"
#include "json/document.h"

USING_NS_CC;
using namespace rapidjson;


ConfigReader* ConfigReader::_configReader = NULL;

#define FILE_CONFIG "config.json"

ConfigReader::ConfigReader()
{
	
}

ConfigReader::~ConfigReader()
{
}

ConfigReader* ConfigReader::getInstance()
{
	if (!_configReader)
	{
		_configReader = new ConfigReader();
		_configReader->loadData();
	}
	return _configReader;
}

void ConfigReader::destroyInstance()
{
	if (_configReader)
	{
		delete _configReader;
		_configReader = NULL;
	}
}

void ConfigReader::loadData()
{
	cocos2d::log("++Load Config++");
	std::string fileContent = FileUtils::getInstance()->getStringFromFile(FILE_CONFIG);

	cocos2d::log("Config : %s", fileContent.c_str());

	rapidjson::Document obj;
	obj.Parse<0>(fileContent.c_str());
	if (obj.HasParseError())
	{
		CCLOG("ERROR: ConfigReader::loadConfig: ParseError %s\n", obj.GetParseError());
		loadDefault();
		return;
	}

	const rapidjson::Value& doc = obj["game_cfg"];
	if (!obj.IsObject()) {
		CCLOG("ERROR: ConfigReader::loadConfig: game_cfg not found");
		loadDefault();
		return;
	}

	if (doc.HasMember("resolution")) {
		const rapidjson::Value& res = doc["resolution"];

		if (res.HasMember("width")) {
			resolutionWidth = res["width"].GetInt();
		}

		if (res.HasMember("height")) {
			resolutionHeight = res["height"].GetInt();
		}

		if (res.HasMember("policy")) {
			resolutionPolicy = res["policy"].GetInt();
		}
	}

	if (doc.HasMember("service_url")) {
		urlService = doc["service_url"].GetString();
	}

	if (doc.HasMember("update_folder")) {
		updateFolder = doc["update_folder"].GetString();
	}

	if (doc.HasMember("search_path_priority")) {
		const rapidjson::Value& resources = doc["search_path_priority"];
		searchPathsPriority.clear();
		for (size_t i = 0; i < resources.Size(); i++) {
			searchPathsPriority.push_back(resources[i].GetString());
		}
	}

	if (doc.HasMember("search_path_js")) {
		const rapidjson::Value& resources2 = doc["search_path_js"];
		searchPathsJS.clear();
		for (size_t i = 0; i < resources2.Size(); i++) {
			searchPathsJS.push_back(resources2[i].GetString());
		}
	}


	if (doc.HasMember("font")) {
		const rapidjson::Value& fnt = doc["font"];

		if (fnt.HasMember("name")) {
			fontName = fnt["name"].GetString();
		}

		if (fnt.HasMember("size")) {
			fontSize = fnt["size"].GetInt();
		}

		if (fnt.HasMember("color")) {
			const rapidjson::Value& fntColor = fnt["color"];
			fontColor = cocos2d::Color4B(fntColor[0].GetInt(), fntColor[1].GetInt(), fntColor[2].GetInt(), fntColor[3].GetInt());
		}
	}

	if (doc.HasMember("dialog")) {
		const rapidjson::Value& diag = doc["dialog"];

		if (diag.HasMember("bg")) {
			dialogBg = diag["bg"].GetString();
		}

		if (diag.HasMember("title")) {
			dialogTitle = diag["title"].GetString();
		}

		if (diag.HasMember("btnOK")) {
			dialogBtnOK = diag["btnOK"].GetString();
		}

		if (diag.HasMember("btnCancel")) {
			dialogBtnCancel = diag["btnCancel"].GetString();
		}

		if (diag.HasMember("textColor")) {
			const rapidjson::Value& diagColor = diag["textColor"];
			dialogTextColor = cocos2d::Color4B(diagColor[0].GetInt(), diagColor[1].GetInt(), diagColor[2].GetInt(), diagColor[3].GetInt());
		}
	}

	if (doc.HasMember("loading")) {
		const rapidjson::Value& loag = doc["loading"];

		if (loag.HasMember("bg")) {
			loadingBg = loag["bg"].GetString();
		}

		if (loag.HasMember("bar")) {
			loadingBar = loag["bar"].GetString();
		}

		if (loag.HasMember("bgBar")) {
			loadingBgBar = loag["bgBar"].GetString();
		}

		if (loag.HasMember("bgBot")) {
			loadingBgBot = loag["bgBot"].GetString();
		}

		if (loag.HasMember("girl")) {
			loadingGirl = loag["girl"].GetString();
		}
		
		if (loag.HasMember("barHeight")) {
			loadingBarHeightPercent = loag["barHeight"].GetDouble();
		}
		
		if (loag.HasMember("bgBotHeight")) {
			loadingBgBotHeightPercent = loag["bgBotHeight"].GetDouble();
		}
	}

	if (doc.HasMember("intro")) {
		const rapidjson::Value& intro = doc["intro"];

		if (intro.HasMember("key")) {
			introKey = intro["key"].GetString();
		}

		if (intro.HasMember("json")) {
			introJSON = intro["json"].GetString();
		}

		if (intro.HasMember("atlas")) {
			introAtlas = intro["atlas"].GetString();
		}

		if (intro.HasMember("sound")) {
			introSound = intro["sound"].GetString();
		}

		if (intro.HasMember("scale")) {
			introScale = intro["scale"].GetDouble();
		}

		if (intro.HasMember("timePlay")) {
			introTimePlay = intro["timePlay"].GetDouble();
		}

		if (intro.HasMember("timeHide")) {
			introTimeHide = intro["timeHide"].GetDouble();
		}
		
		if (intro.HasMember("bgAnim")) {
			bgAnim = intro["bgAnim"].GetString();
		}

		if (intro.HasMember("borderAnim")) {
			borderAnim = intro["borderAnim"].GetString();
		}
	}

	cocos2d::log("++Load Config Success++");
}

void ConfigReader::addSearchPath(std::string downloadPath)
{
	cocos2d::log("##addSearchPath %s",downloadPath.c_str());

	//cocos2d::log("--Add Search Path : %s", downloadPath.c_str());

	FileUtils::getInstance()->addSearchPath(downloadPath, true);
	int i;
	for (i = 0; i < searchPathsPriority.size(); i++) {
		FileUtils::getInstance()->addSearchPath(downloadPath + searchPathsPriority[i], true);
	}
	
	for (i = 0; i < searchPathsJS.size(); i++) {
		//cocos2d::log(searchPathsJS[i].c_str());
		FileUtils::getInstance()->addSearchPath(searchPathsJS[i]);
	}
}

void ConfigReader::loadDefault()
{
	searchPathsPriority.clear();
	searchPathsJS.clear();

	resolutionWidth = 1200;
	resolutionHeight = 700;
	resolutionPolicy = 3;

	urlService = "http://mobile-service.zingplay.com/versionV2.php";
	updateFolder = "zingplay";

	fontName = "res/fonts/tahoma.ttf";
	fontColor = cocos2d::Color4B(103, 92, 115, 255);
	fontSize = 26;

	loadingBg = "res/Loading/bgLoading.png";
	loadingBar = "res/Loading/barLoading.png";
	loadingBgBar = "res/Loading/bar.png";
	loadingBarHeightPercent = 0.1;

	introJSON = "res/Loading/zp_ident.json";
	introAtlas = "res/Loading/zp_ident.atlas";
	introKey = "run";
	introSound = "res/common/zp_ident.mp3";
	introTimePlay = 4;
	introTimeHide = 0.5;
	introScale = 0.5f;
	bgAnim = "res/Armatures/ZpBrand/bgAnim.png";
	borderAnim = "res/Armatures/ZpBrand/borderAnim.png";

	dialogBg = "res/Lobby/Dialog/table.png";
	dialogTitle = "res/Lobby/LobbyGUI/titleDialog.png";
	dialogBtnOK = "res/Lobby/Dialog/btn_ok.png";
	dialogBtnCancel = "res/Lobby/Dialog/btn_cancel.png";
	dialogTextColor = cocos2d::Color4B(132, 140, 220, 255);
}