#include "ClientConfig.h"
#include "json/document.h"

USING_NS_CC;
using namespace rapidjson;


static const char *A_RESOURCES = "resources";
static const char *A_FOLDER = "folder";
static const char *A_SCALE = "scale";
static const char *A_USE_SCALE_FULL = "useScaleFull";
static const char *A_SELECT_SCALE = "selectScale";
static const char *A_WIDTH_DESIGN = "widthDesign";
static const char *A_HEIGH_DESIGN = "heightDesign";
static const char *A_MAX_SCREEN_RATIO = "maxScreenRatio";
static const char *A_MIN_SCREEN_RATIO = "minScreenRatio";
ClientConfig* ClientConfig::_clientConfig = NULL;

#define FILE_CONFIG "res/client_config.json"
ClientConfig::ClientConfig()
{
	_minScreenRatio = 0;
	_maxScreenRatio = 100;
	_isFirstSetSearchPath = true;
}

ClientConfig::~ClientConfig()
{
}

ClientConfig* ClientConfig::getInstance()
{
	if (!_clientConfig)
	{
		_clientConfig = new ClientConfig();
		_clientConfig->loadData();
	}
	return _clientConfig;
}

void ClientConfig::destroyInstance()
{
	if (_clientConfig)
	{
		delete _clientConfig;
		_clientConfig = NULL;
	}
}

void ClientConfig::loadData()
{
	std::string fileContent = FileUtils::getInstance()->getStringFromFile(FILE_CONFIG);

	rapidjson::Document doc;
	doc.Parse<0>(fileContent.c_str());
	if (doc.HasParseError())
	{
		CCLOG("ERROR: ClientConfig::loadConfig: ParseError %s\n", doc.GetParseError());
	}
	_selectScale = doc[A_SELECT_SCALE].GetDouble();
	int w, h;
	w = doc[A_WIDTH_DESIGN].GetInt();
	h = doc[A_HEIGH_DESIGN].GetInt();
	_designResolutionSize = Size(w,h);
	const rapidjson::Value& resources = doc[A_RESOURCES];
	list.clear();
	for (size_t i = 0; i < resources.Size(); i++)
	{
		ResourceItem resourceItem;
		resourceItem.scale = resources[i][A_SCALE].GetDouble();
		resourceItem.folder = resources[i][A_FOLDER].GetString();
		list.push_back(resourceItem);
	};
	if (doc.HasMember(A_MIN_SCREEN_RATIO))
	{
		_minScreenRatio = doc[A_MIN_SCREEN_RATIO].GetDouble();
	}
	if (doc.HasMember(A_MAX_SCREEN_RATIO))
	{
		_maxScreenRatio = doc[A_MAX_SCREEN_RATIO].GetDouble();
	}
}


void ClientConfig::detectResourceFromScreenSize()
{
	auto director = Director::getInstance();
	auto glview = director->getOpenGLView();

	Size frameSize = glview->getFrameSize();
	_searchPath.clear();

	float wScale = frameSize.width / _designResolutionSize.width;
	float hScale = frameSize.height / _designResolutionSize.height;
	float frameScale = wScale < hScale ? wScale : hScale;
	float m_ImageScale;
	ResourceItem select;
	//tinh imageScale, chon resource anh
	for (unsigned int i = 0; i < list.size(); i++){
		ResourceItem s = list.at(i);
		float scale = frameScale/s.scale;
		if ((1 / scale >= 1) || (i == list.size() - 1 && 1 / scale <= 1)){
			m_ImageScale = scale;
			select = list.at(i);
			break;
		}
		if (i < list.size() - 1){
			ResourceItem nextSize = list.at(i + 1);
			float nextScale = frameScale / nextSize.scale;
			if (1 / nextScale>1){
				float avgScale = 1 / scale + (1 / nextScale - 1 / scale)*_selectScale;
				if (avgScale>1){
					m_ImageScale = scale;
					select = list.at(i);
				}
				else{
					m_ImageScale = nextScale;
					select = list.at(i + 1);
				}
				break;
			}
		}
	}
	_selectResource = select;
	_searchPath.push_back(select.folder);
	_selectScale = m_ImageScale;
	_selectFolder = select.folder;

}
void ClientConfig::updateResourceSearchPath()
{
	std::vector<std::string> listSearch;

	for (unsigned int i = 0; i < _searchPath.size(); i++)
	{
		listSearch.push_back(_searchPath.at(i));
	}
	//original
	if (this->_isFirstSetSearchPath)
	{
		_originPath = FileUtils::getInstance()->getSearchPaths();
		_isFirstSetSearchPath = false;
	}
	for (unsigned int i = 0; i < _originPath.size(); i++)
	{
		listSearch.push_back(_originPath[i]);
	}
	listSearch.push_back("res/common");
	listSearch.push_back("res");
	FileUtils::getInstance()->setSearchPaths(listSearch);
}

std::string ClientConfig::getPathFromResource(const std::string& path)
{
	std::string newPath = _selectFolder + "/" + path;
	return newPath;
}

float ClientConfig::getResourceScale()
{
	return _selectResource.scale;
}

cocos2d::Size ClientConfig::getDesignResolutionSize()
{
	return _designResolutionSize;
}
bool ClientConfig::isSupportThisDeviceScreen()
{
	auto glview = Director::getInstance()->getOpenGLView();
	auto frameSize  = glview->getFrameSize();
	float ratio = frameSize.width / frameSize.height;
	return ratio <= this->getMaxSupportScreenRatio() && ratio >= this->getMinSupportScreenRatio();
	return false;
}
float ClientConfig::getMaxSupportScreenRatio()
{
	return _maxScreenRatio;
}
float ClientConfig::getMinSupportScreenRatio()
{
	return _minScreenRatio;
}