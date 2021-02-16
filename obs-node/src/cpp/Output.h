#pragma once
#include <napi.h>
#include <obs.h>

class Output : public Napi::ObjectWrap<Output> {
public:
  explicit Output(const Napi::CallbackInfo &info);
  ~Output() override;

  Napi::Value SetVideoEncoder(const Napi::CallbackInfo &info);
  Napi::Value SetAudioEncoder(const Napi::CallbackInfo &info);
  Napi::Value UseRaw(const Napi::CallbackInfo &info);

  Napi::Value SetMixers(const Napi::CallbackInfo &info);

  Napi::Value UpdateSettings(const Napi::CallbackInfo &info);
  Napi::Value GetSettings(const Napi::CallbackInfo &info);

  Napi::Value SetService(const Napi::CallbackInfo &info);
  Napi::Value Start(const Napi::CallbackInfo &info);
  Napi::Value Stop(const Napi::CallbackInfo &info);

  static Napi::Function GetClass(Napi::Env env);
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

private:
  std::string outputId;
  std::string name;
  obs_output_t *outputReference;
};
