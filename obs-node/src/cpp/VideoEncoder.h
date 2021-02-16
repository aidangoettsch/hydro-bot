#pragma once
#include <napi.h>
#include <obs.h>
#include "utils.h"

class VideoEncoder: public Napi::ObjectWrap<VideoEncoder> {
public:
  explicit VideoEncoder(const Napi::CallbackInfo &info);
  ~VideoEncoder() override;

  Napi::Value Use(const Napi::CallbackInfo &info);
  Napi::Value UpdateSettings(const Napi::CallbackInfo &info);

  static Napi::Function GetClass(Napi::Env env);
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

  obs_encoder_t *encoderReference;

private:
  std::string encoderId;
  std::string name;
  int mixIdx;
};
