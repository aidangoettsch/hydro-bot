#pragma once

#include <string>
#include <obs.h>
#include <napi.h>
class Source: public Napi::ObjectWrap<Source> {
public:
  explicit Source(const Napi::CallbackInfo &info);
  ~Source() override;

  Napi::Value UpdateSettings(const Napi::CallbackInfo &info);
  Napi::Value GetSettings(const Napi::CallbackInfo &info);
  Napi::Value StartTransition(const Napi::CallbackInfo &info);
  Napi::Value AssignOutputChannel(const Napi::CallbackInfo &info);

  static Napi::Function GetClass(Napi::Env env);
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

  obs_source_t *sourceReference;

private:
  std::string sourceType;
  std::string name;
};
