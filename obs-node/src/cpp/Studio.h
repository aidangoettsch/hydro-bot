#pragma once

#define NAPI_VERSION 7
#include <napi.h>

namespace Studio {
  Napi::Value Startup(const Napi::CallbackInfo &info);
  Napi::Value Shutdown(const Napi::CallbackInfo &info);
  Napi::Value ResetVideo(const Napi::CallbackInfo &info);
  Napi::Value ResetAudio(const Napi::CallbackInfo &info);

  Napi::Object Init(Napi::Env env, Napi::Object exports);

  void LoadModule(const std::string& moduleName);
  std::string GetObsBinPath();
  std::string GetObsPluginPath();
  std::string GetObsPluginDataPath();
};
