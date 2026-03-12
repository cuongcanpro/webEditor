#ifndef ClientConfig_h__
#define ClientConfig_h__

#include "cocos2d.h"
#include <vector>
#include <string>

namespace tinyxml2
{
	class XMLElement;
}

struct ResourceItem
{
	float scale;
	std::string folder;
	~ResourceItem(){};
};
class ClientConfig
{
public:
	~ClientConfig();
	static ClientConfig* getInstance();
	static void destroyInstance();
public:
	void detectResourceFromScreenSize();
	void updateResourceSearchPath();
	std::string getPathFromResource(const std::string& path);
	float getResourceScale();
	cocos2d::Size getDesignResolutionSize();
	bool isSupportThisDeviceScreen();
	float getMaxSupportScreenRatio();
	float getMinSupportScreenRatio();
private:
	ClientConfig();
	void loadData();
private:
	static ClientConfig* _clientConfig;
	std::vector<ResourceItem> list;
	float _selectScale;
	ResourceItem _selectResource;
	std::string _selectFolder;
	cocos2d::Size  _designResolutionSize;
	std::vector<std::string> _searchPath;
	std::vector<std::string> _originPath;
	float _minScreenRatio;
	float _maxScreenRatio;
	bool _isFirstSetSearchPath;
	CC_SYNTHESIZE_READONLY(int, _version, Version)
	CC_SYNTHESIZE_READONLY(int, _storeType, StoreType)
	CC_SYNTHESIZE_READONLY(int, _gameIndex, GameIndex)
};
#endif // ClientConfig_h__
