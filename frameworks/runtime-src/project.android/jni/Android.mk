LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

LOCAL_MODULE := cocos2djs_shared

LOCAL_MODULE_FILENAME := libcocos2djs

LOCAL_ARM_MODE := arm

LOCAL_SRC_FILES := \
../../../Classes/AppDelegate.cpp \
../../../Classes/update/CCLocalizedString.cpp \
../../../Classes/update/DialogUI.cpp \
../../../Classes/update/LoadingScene.cpp \
../../../Classes/update/NativeBridge.cpp \
../../../Classes/update/ConfigReader.cpp \
hellojavascript/main.cpp
LOCAL_CXXFLAGS += -fexceptions

LOCAL_C_INCLUDES := $(LOCAL_PATH)/../../../Classes \
					$(LOCAL_PATH)/../../../../cocos2d-x/zingbase
LOCAL_STATIC_LIBRARIES := cocos2d_js_static jsb_pluginx_static android_native_app_glue
LOCAL_STATIC_LIBRARIES += zingbase_static
LOCAL_WHOLE_STATIC_LIBRARIES += jsb_pluginx_static


include $(BUILD_SHARED_LIBRARY)

$(call import-module,scripting/js-bindings/proj.android/prebuilt-mk)
$(call import-module,plugin/jsbindings/prebuilt-mk)
$(call import-module,zingbase/prebuilt-mk)
$(call import-module,android/native_app_glue) 