#include "OutputService.h"

OutputService::OutputService(const Napi::CallbackInfo &info)
    : ObjectWrap(info) {
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

  serviceId = info[0].ToString().Utf8Value();
  name = info[1].ToString().Utf8Value();

  obs_data_t *settings = obs_output_defaults(serviceId.c_str());

  if (settings == nullptr) {
    Napi::TypeError::New(env, "Could not get default output settings")
        .ThrowAsJavaScriptException();
    return;
  }

  if (info[3].IsObject()) {
    DataFromObject(env, info[3].ToObject(), settings);
  }

  serviceReference = obs_service_create(serviceId.c_str(), name.c_str(), settings, nullptr);
}

OutputService::~OutputService() {
  obs_service_release(serviceReference);
}

Napi::Value OutputService::UpdateSettings(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "First argument must be an object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  obs_data_t *settings = obs_service_get_settings(serviceReference);

  if (settings == nullptr) {
    Napi::TypeError::New(env, "Could not get current output settings")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  DataFromObject(env, info[0].ToObject(), settings);

  obs_service_update(serviceReference, settings);
  return env.Null();
}

Napi::Function OutputService::GetClass(Napi::Env env) {
  return DefineClass(env, "OutputService", {
      OutputService::InstanceMethod("updateSettings", &OutputService::UpdateSettings)
  });
}

Napi::Object OutputService::Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "OutputService"), OutputService::GetClass(env));
  return exports;
}
