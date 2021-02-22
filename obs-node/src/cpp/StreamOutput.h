#pragma once
#include "Output.h"
#include <napi.h>
#include <obs.h>
#include "utils.h"
#include "AudioEncoder.h"
#include "VideoEncoder.h"

using Context = Napi::Reference<Napi::Value>;

class StreamOutput : public Napi::ObjectWrap<StreamOutput> {
public:
  explicit StreamOutput(const Napi::CallbackInfo &info);

  Napi::Value SetVideoEncoder(const Napi::CallbackInfo &info);
  Napi::Value SetAudioEncoder(const Napi::CallbackInfo &info);
  Napi::Value SetMixer(const Napi::CallbackInfo &info);

  Napi::Value UpdateSettings(const Napi::CallbackInfo &info);

  Napi::Value Start(const Napi::CallbackInfo &info);
  Napi::Value Stop(const Napi::CallbackInfo &info);

  static Napi::Function GetClass(Napi::Env env);
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

private:
  std::string name;
  obs_output_t *outputReference;
  Napi::ThreadSafeFunction onDataRef;
  Napi::ThreadSafeFunction onStopRef;
};

