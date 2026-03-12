//
//  CCLocalizedString.cpp
//  SkeletonX
//
//  Created by mac on 11-12-1.
//  Copyright (c) 2011年 GeekStudio. All rights reserved.
//

#include "platform/CCApplication.h"
#include "platform/CCCommon.h"
#include "CCDirector.h"
USING_NS_CC;

#include <iostream>
#include <sstream>
#include <string>
#include <map>
using namespace std;

#include "CCLocalizedString.h"
#include "platform/CCFileUtils.h"

static map<std::string,std::string> localizedStrings;
static map<std::string, std::string> gameConfigs;

string CCLocalizedString(const char * mKey, const char *mComment)
{
    const char * fileName = "res/Localized_vi";
        
    std::string resultStr;
    
    if (localizedStrings.empty()) 
    {
        // Initialize variables needed
        ssize_t fileSize = 0;
        unsigned char * fileContents = NULL;
        string line, fullPath, contents;
        
        // Get absolute path of file
		fullPath = FileUtils::sharedFileUtils()->fullPathForFilename(fileName);
        
        // Get data of file
        fileContents = FileUtils::sharedFileUtils()->getFileData(fullPath.c_str(), "r", &fileSize );
        contents.append( ( char * ) fileContents );
        
        // Create a string stream so that we can use getline( ) on it
        istringstream fileStringStream( contents );
        
        // Get file contents line by line
        while ( std::getline( fileStringStream, line ) )
		{
//            debug_Printf("line :%s",line.c_str());
            if (line.find("/*",0) == string::npos &&
                line.find("//",0) == string::npos &&
                line.find("*/",0) == string::npos ) //filter the valid string of one line
            {
//                debug_Printf("find the line not start with \" /* \"");
                std::string::size_type validPos= line.find('=',0);
                if ( validPos != string::npos) 
                {
//                    debug_Printf("fimd the line contain \" = \"");
                    std::string keyStr = line.substr(0,validPos-1);
                    std::string subStr = line.substr(validPos+1,line.size() -1); // get valid string
 
                    //trim space
                    keyStr.erase(0, keyStr.find_first_not_of(" \t")); // 去掉头部空格
                    keyStr.erase(keyStr.find_last_not_of(" \t") + 1); // 去掉尾部空格
                    
                    subStr.erase(0, subStr.find_first_not_of(" \t")); // 去掉头部空格
                    subStr.erase(subStr.find_last_not_of(" \t") + 1); // 去掉尾部空格
                    
                    //trim \" 
                    keyStr.erase(0, keyStr.find_first_not_of("\""));
					int findPosition = subStr.find('\"', 0);
					//if (findPosition != string::npos)
					//	subStr.erase(findPosition);
                    keyStr.erase(keyStr.find_last_not_of("\"") + 1);
                    
					//cocos2d::CCLog("string before erase %s", subStr.c_str());
					subStr.erase(0, subStr.find_first_not_of("\""));
					//cocos2d::CCLog("string after erase %s", subStr.c_str());



					//trim ; character and last \" character
					subStr.erase(subStr.find_last_not_of(";") + 1);
					int position = subStr.find_last_not_of("\"") + 1;
					findPosition = subStr.find('\"', 0);
					if (findPosition != string::npos)
						subStr.erase(findPosition);
					//cocos2d::CCLog("string final %s %i %i", subStr.c_str(), position, findPosition);
                    
                    
                    //replace line feed with \n
                    string::size_type pos(0);
                    string old_value("\\n");
                    if((pos=subStr.find(old_value))!=string::npos)
                    {
                        for(; pos!=string::npos; pos+=1)
                        {   
                            if((pos=subStr.find(old_value,pos))!=string::npos)
                            {
                                subStr.erase(pos, 2);
                                subStr.insert(pos, 1, '\n');
                            }   
                            else   
                                break;
                        }
                    }
                    
                    localizedStrings.insert(std::pair<std::string, std::string>(keyStr,subStr));
                    
                    const char * keyChars = keyStr.c_str();
                    
                    if (strcmp(keyChars,mKey) == 0) {
                        resultStr = subStr;
                    }
                }
            }
        }
        //must delete fileContents
        if (fileContents!= NULL) {
            delete [] fileContents;
            fileContents = NULL;
        }
        
        //return valid value
        if (resultStr.length() > 0){
            return (string(resultStr)).c_str();
        }
        return mKey;
    }
    else
    {
        std::map<std::string,std::string>::iterator itr = localizedStrings.find(std::string(mKey));
        if (itr != localizedStrings.end()) {
            return (itr->second).c_str();
        }
    }
    return mKey;
}

string GameConfig(const char * mKey, const char *mComment)
{
	const char * fileName = "res/GameConfig";

	std::string resultStr;

	if (gameConfigs.empty())
	{
		// Initialize variables needed
		ssize_t fileSize = 0;
		unsigned char * fileContents = NULL;
		string line, fullPath, contents;

		// Get absolute path of file
		fullPath = FileUtils::sharedFileUtils()->fullPathForFilename(fileName);

		// Get data of file
		fileContents = FileUtils::sharedFileUtils()->getFileData(fullPath.c_str(), "r", &fileSize);
		contents.append((char *)fileContents);

		// Create a string stream so that we can use getline( ) on it
		istringstream fileStringStream(contents);

		// Get file contents line by line
		while (std::getline(fileStringStream, line))
		{
			//            debug_Printf("line :%s",line.c_str());
			if (line.find("/*", 0) == string::npos &&
				line.find("//", 0) == string::npos &&
				line.find("*/", 0) == string::npos) //filter the valid string of one line
			{
				//                debug_Printf("find the line not start with \" /* \"");
				std::string::size_type validPos = line.find('=', 0);
				if (validPos != string::npos)
				{
					//                    debug_Printf("fimd the line contain \" = \"");
					std::string keyStr = line.substr(0, validPos - 1);
					std::string subStr = line.substr(validPos + 1, line.size() - 1); // get valid string

					//trim space
					keyStr.erase(0, keyStr.find_first_not_of(" \t")); // 去掉头部空格
					keyStr.erase(keyStr.find_last_not_of(" \t") + 1); // 去掉尾部空格

					subStr.erase(0, subStr.find_first_not_of(" \t")); // 去掉头部空格
					subStr.erase(subStr.find_last_not_of(" \t") + 1); // 去掉尾部空格

					//trim \" 
					keyStr.erase(0, keyStr.find_first_not_of("\""));
					int findPosition = subStr.find('\"', 0);
					//if (findPosition != string::npos)
					//	subStr.erase(findPosition);
					keyStr.erase(keyStr.find_last_not_of("\"") + 1);

					//cocos2d::CCLog("string before erase %s", subStr.c_str());
					subStr.erase(0, subStr.find_first_not_of("\""));
					//cocos2d::CCLog("string after erase %s", subStr.c_str());



					//trim ; character and last \" character
					subStr.erase(subStr.find_last_not_of(";") + 1);
					int position = subStr.find_last_not_of("\"") + 1;
					findPosition = subStr.find('\"', 0);
					if (findPosition != string::npos)
						subStr.erase(findPosition);
					//cocos2d::CCLog("string final %s %i %i", subStr.c_str(), position, findPosition);


					//replace line feed with \n
					string::size_type pos(0);
					string old_value("\\n");
					if ((pos = subStr.find(old_value)) != string::npos)
					{
						for (; pos != string::npos; pos += 1)
						{
							if ((pos = subStr.find(old_value, pos)) != string::npos)
							{
								subStr.erase(pos, 2);
								subStr.insert(pos, 1, '\n');
							}
							else
								break;
						}
					}

					gameConfigs.insert(std::pair<std::string, std::string>(keyStr, subStr));

					const char * keyChars = keyStr.c_str();

					if (strcmp(keyChars, mKey) == 0) {
						resultStr = subStr;
					}
				}
			}
		}
		//must delete fileContents
		if (fileContents != NULL) {
			delete[] fileContents;
			fileContents = NULL;
		}

		//return valid value
		if (resultStr.length() > 0){
			return (string(resultStr)).c_str();
		}
		return mKey;
	}
	else
	{
		std::map<std::string, std::string>::iterator itr = gameConfigs.find(std::string(mKey));
		if (itr != gameConfigs.end()) {
			return (itr->second).c_str();
		}
	}
	return mKey;
}
