#pragma once

#include <napi.h>
#include <obs.h>
#include "utils.h"

class OutputService: public Napi::ObjectWrap<OutputService> {
public:
  explicit OutputService(const Napi::CallbackInfo &info);
  ~OutputService() override;

  Napi::Value UpdateSettings(const Napi::CallbackInfo &info);

  static Napi::Function GetClass(Napi::Env env);
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

  obs_service_t *serviceReference;

private:
  std::string serviceId;
  std::string name;
};
