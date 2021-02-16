#pragma once
#include <napi.h>
#include <obs.h>
#include "utils.h"

class AudioEncoder: public Napi::ObjectWrap<AudioEncoder> {
public:
  explicit AudioEncoder(const Napi::CallbackInfo &info);
  ~AudioEncoder() override;

  Napi::Value UpdateSettings(const Napi::CallbackInfo &info);
  Napi::Value Use(const Napi::CallbackInfo &info);

  static Napi::Function GetClass(Napi::Env env);
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

  obs_encoder_t *encoderReference;
private:
  std::string encoderId;
  std::string name;
  int mixIdx;
};
