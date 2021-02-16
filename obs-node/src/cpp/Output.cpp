#include "Output.h"
#include "VideoEncoder.h"
#include "AudioEncoder.h"
#include "OutputService.h"
#include "utils.h"

Output::Output(const Napi::CallbackInfo &info) : ObjectWrap(info) {
  Napi::Env env = info.Env();

  if (info.Length() < 3) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return;
  }

  if (!info[0].IsString() || !info[1].IsString()) {
    Napi::TypeError::New(env, "First two arguments must be strings")
        .ThrowAsJavaScriptException();
    return;
  }

  if (!info[2].IsUndefined() && !info[2].IsNull() && !info[2].IsObject()) {
    Napi::TypeError::New(env, "Third argument must be null or object")
        .ThrowAsJavaScriptException();
    return;
  }

  outputId = info[0].ToString().Utf8Value();
  name = info[1].ToString().Utf8Value();

  obs_data_t *settings = obs_output_defaults(outputId.c_str());
  if (info[2].IsObject()) {
    DataFromObject(env, info[2].ToObject(), settings);
  }

  outputReference = obs_output_create(outputId.c_str(), name.c_str(), settings, nullptr);

  if (outputReference == nullptr) {
    Napi::TypeError::New(env, "Error creating output")
        .ThrowAsJavaScriptException();
    return;
  }

  obs_output_update(outputReference, settings);
}

Output::~Output() {
  obs_output_release(outputReference);
}

Napi::Value Output::SetVideoEncoder(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (info.Length() != 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "First argument must be a source object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  try {
    VideoEncoder *encoder = VideoEncoder::Unwrap(info[0].ToObject());

    obs_output_set_video_encoder(outputReference, encoder->encoderReference);
  } catch (const std::exception &e) {
    Napi::TypeError::New(env, "First argument must be a source object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  return Napi::Value();
}

Napi::Value Output::SetAudioEncoder(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "First argument must be a source object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  long idx = 0;
  if (info[1].IsNumber()) {
    idx = info[1].ToNumber();
  }

  try {
    AudioEncoder *encoder = AudioEncoder::Unwrap(info[0].ToObject());

    obs_output_set_audio_encoder(outputReference, encoder->encoderReference, idx);
  } catch (const std::exception &e) {
    Napi::TypeError::New(env, "First argument must be a source object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Null();
}

Napi::Value Output::UseRaw(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  obs_output_set_media(outputReference, obs_get_video(), obs_get_audio());

  return env.Null();
}

Napi::Value Output::SetMixers(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!info[0].IsNumber()) {
    Napi::TypeError::New(env, "First argument must be a number")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  obs_output_set_mixers(outputReference, info[0].ToNumber().Int64Value());

  return env.Null();
}

Napi::Value Output::UpdateSettings(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "First argument must be an object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  obs_data_t *settings = obs_output_get_settings(outputReference);
  DataFromObject(env, info[0].ToObject(), settings);

  obs_output_update(outputReference, settings);
  return env.Null();
}

Napi::Value Output::GetSettings(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  obs_data_t *settings = obs_output_get_settings(outputReference);
  const char *json = obs_data_get_json(settings);

  return Napi::String::New(env, json);
}

Napi::Value Output::SetService(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  if (info.Length() != 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "First argument must be a source object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  try {
    OutputService *service = OutputService::Unwrap(info[0].ToObject());

    obs_output_set_service(outputReference, service->serviceReference);
  } catch (const std::exception &e) {
    Napi::TypeError::New(env, "First argument must be a source object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Null();
}

Napi::Value Output::Start(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!obs_output_start(outputReference)) {
    Napi::TypeError::New(env, "Could not start output")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Null();
}

Napi::Value Output::Stop(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  obs_output_stop(outputReference);

  return env.Null();
}

Napi::Function Output::GetClass(Napi::Env env) {
  return DefineClass(env, "Output", {
      Output::InstanceMethod("setVideoEncoder", &Output::SetVideoEncoder),
      Output::InstanceMethod("setAudioEncoder", &Output::SetAudioEncoder),
      Output::InstanceMethod("useRaw", &Output::UseRaw),
      Output::InstanceMethod("setMixers", &Output::SetMixers),
      Output::InstanceMethod("updateSettings", &Output::UpdateSettings),
      Output::InstanceMethod("getSettings", &Output::GetSettings),
      Output::InstanceMethod("setService", &Output::SetService),
      Output::InstanceMethod("start", &Output::Start),
      Output::InstanceMethod("stop", &Output::Stop)
  });
}

Napi::Object Output::Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "Output"), Output::GetClass(env));
  return exports;
}
