#pragma once

#include <string>
#include <obs.h>
#include <napi.h>
#include "utils.h"
class Source: public Napi::ObjectWrap<Source> {
public:
  explicit Source(const Napi::CallbackInfo &info);
  ~Source() override;

  void SetupSignalHandler();
  Napi::Value UpdateSettings(const Napi::CallbackInfo &info);
  Napi::Value GetSettings(const Napi::CallbackInfo &info);
  Napi::Value StartTransition(const Napi::CallbackInfo &info);
  Napi::Value AssignOutputChannel(const Napi::CallbackInfo &info);
  Napi::Value GetHeight(const Napi::CallbackInfo &info);
  Napi::Value GetWidth(const Napi::CallbackInfo &info);

  static Napi::Function GetClass(Napi::Env env);
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

  obs_source_t *sourceReference;

private:
  Napi::ThreadSafeFunction signalHandler;
  signal_handler_t* sourceSignalHandler;
  std::string sourceType;
  std::string name;
};
