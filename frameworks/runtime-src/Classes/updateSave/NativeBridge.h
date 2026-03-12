#ifndef NativeBridge_h__
#define NativeBridge_h__

#include <string>

class NativeBridge {
	
public:
	static std::string getDeviceID();
	static std::string getRefer();
	static std::string getVersionString();
	static std::string getVersionCode();
	static std::string getGameVersion();

	static bool checkNetwork();
	static void openURLNative(std::string url);
};

#endif // NativeBridge_h__

