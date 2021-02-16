#include "VideoEncoder.h"

VideoEncoder::VideoEncoder(const Napi::CallbackInfo &info) : ObjectWrap(info) {
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

  if (!info[3].IsUndefined() && !info[3].IsNull() && !info[3].IsObject()) {
    Napi::TypeError::New(env, "Third argument must be null or object")
        .ThrowAsJavaScriptException();
    return;
  }

  encoderId = info[0].ToString().Utf8Value();
  name = info[1].ToString().Utf8Value();

  obs_data_t *settings = obs_encoder_defaults(encoderId.c_str());
  if (info[3].IsObject()) {
    DataFromObject(env, info[3].ToObject(), settings);
  }

  encoderReference = obs_video_encoder_create(encoderId.c_str(), name.c_str(), settings, nullptr);

  if (encoderReference == nullptr) {
    Napi::TypeError::New(env, "Could not create encoder object")
        .ThrowAsJavaScriptException();
    return;
  }

  obs_encoder_update(encoderReference, settings);
}

VideoEncoder::~VideoEncoder() {
  obs_encoder_release(encoderReference);
}

Napi::Value VideoEncoder::UpdateSettings(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "First argument must be an object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  obs_data_t *settings = obs_encoder_get_settings(encoderReference);

  if (settings == nullptr) {
    Napi::TypeError::New(env, "Could not get current encoder settings")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  DataFromObject(env, info[0].ToObject(), settings);

  obs_encoder_update(encoderReference, settings);
  return env.Null();
}

Napi::Value VideoEncoder::Use(const Napi::CallbackInfo &info) {
  obs_encoder_set_video(encoderReference, obs_get_video());
  return Napi::Value();
}

Napi::Function VideoEncoder::GetClass(Napi::Env env) {
  return DefineClass(env, "VideoEncoder", {
      VideoEncoder::InstanceMethod("updateSettings", &VideoEncoder::UpdateSettings),
      VideoEncoder::InstanceMethod("use", &VideoEncoder::Use)
  });
}

Napi::Object VideoEncoder::Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "VideoEncoder"), VideoEncoder::GetClass(env));
  return exports;
}
