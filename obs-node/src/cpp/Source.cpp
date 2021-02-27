#include "Source.h"

Source::Source(const Napi::CallbackInfo &info) : ObjectWrap(info) {
  Napi::Env env = info.Env();

  if (info.Length() < 2) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return;
  }

  if (!info[0].IsString() || !info[1].IsString()) {
    Napi::TypeError::New(env, "First two arguments must be strings")
        .ThrowAsJavaScriptException();
    return;
  }

  if (!info[2].IsFunction() && !info[2].IsNull() && !info[2].IsUndefined()) {
    Napi::TypeError::New(env, "Third argument must be a function or null")
        .ThrowAsJavaScriptException();
    return;
  }

  if (!info[3].IsUndefined() && !info[3].IsNull() && !info[3].IsObject()) {
    Napi::TypeError::New(env, "Fourth argument must be an object or null")
        .ThrowAsJavaScriptException();
    return;
  }

  sourceType = info[0].ToString().Utf8Value();
  name = info[1].ToString().Utf8Value();
  if (sourceType == "scene") {
    if (info[2].IsFunction()) {
      signalHandler = Napi::ThreadSafeFunction::New(
          env, info[2].As<Napi::Function>(), "Source Signal Handler", 0, 1);

      return;
    }
  }

  obs_data_t *settings = obs_get_source_defaults(sourceType.c_str());

  if (settings == nullptr) {
    Napi::TypeError::New(env, "Could not get source default settings")
        .ThrowAsJavaScriptException();
    return;
  }

  if (info[3].IsObject()) {
    DataFromObject(env, info[3].ToObject(), settings);
  }

  sourceReference = obs_source_create(sourceType.c_str(), name.c_str(), nullptr, nullptr);

  if (sourceReference == nullptr) {
    Napi::TypeError::New(env, "Could not create source object")
        .ThrowAsJavaScriptException();
    return;
  }

  obs_source_update(sourceReference, settings);
  obs_source_set_audio_mixers(sourceReference, 1);
  if (info[2].IsFunction()) {
    signalHandler = Napi::ThreadSafeFunction::New(
        env, info[2].As<Napi::Function>(), "Source Signal Handler", 0, 1);

    SetupSignalHandler();
  }
}

void Source::SetupSignalHandler() {
  if (!signalHandler) return;

  sourceSignalHandler = obs_source_get_signal_handler(sourceReference);
  signal_handler_connect_global(
      sourceSignalHandler,
      [](void *sourceData, const char *signalName, calldata_t *signalData) {
        auto source = reinterpret_cast<Source *>(sourceData);
        auto signal = new struct signal();
        signal->name = signalName;
        signal->data = signalData;

        source->signalHandler.BlockingCall(
            signal, [](Napi::Env env, Napi::Function jsCallback,
                       struct signal *data) {
              jsCallback.Call({Napi::String::New(env, data->name)});
              delete data;
            });
      },
      this);
}

Source::~Source() {
  if (sourceReference != nullptr) obs_source_release(sourceReference);
}

Napi::Value Source::UpdateSettings(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "First argument must be an object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  obs_data_t *settings = obs_source_get_settings(sourceReference);

  if (settings == nullptr) {
    Napi::TypeError::New(env, "Could not get current source settings")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  DataFromObject(env, info[0].ToObject(), settings);

  obs_source_update(sourceReference, settings);
  return env.Null();
}

Napi::Value Source::GetSettings(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  obs_data_t *settings = obs_source_get_settings(sourceReference);
  const char *json = obs_data_get_json(settings);

  return Napi::String::New(env, json);
}

Napi::Value Source::StartTransition(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  if (info.Length() != 2) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsNumber()) {
    Napi::TypeError::New(env, "First argument must be a number")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[1].IsObject()) {
    Napi::TypeError::New(env, "Second argument must be a source object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  try {
    uint32_t duration = info[0].ToNumber();
    Source *dest = Source::Unwrap(info[1].ToObject());

     if (!obs_transition_start(sourceReference, OBS_TRANSITION_MODE_AUTO, duration, dest->sourceReference)) {
       Napi::TypeError::New(env, "Transition failed to start")
           .ThrowAsJavaScriptException();
     }
  } catch (const std::exception &e) {
    Napi::TypeError::New(env, "First argument must be a source object")
        .ThrowAsJavaScriptException();
  }
  return env.Null();
}

Napi::Value Source::AssignOutputChannel(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();
  if (info.Length() != 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsNumber()) {
    Napi::TypeError::New(env, "First argument must be a number")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  obs_set_output_source(info[0].ToNumber(), sourceReference);
  return env.Null();
}

Napi::Value Source::GetHeight(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  return Napi::Number::New(env, obs_source_get_height(sourceReference));
}

Napi::Value Source::GetWidth(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  return Napi::Number::New(env, obs_source_get_width(sourceReference));
}

Napi::Function Source::GetClass(Napi::Env env) {
  return DefineClass(env, "Source", {
      Source::InstanceMethod("updateSettings", &Source::UpdateSettings),
      Source::InstanceMethod("getSettings", &Source::GetSettings),
      Source::InstanceMethod("startTransition", &Source::StartTransition),
      Source::InstanceMethod("assignOutputChannel", &Source::AssignOutputChannel),
      Source::InstanceMethod("getHeight", &Source::GetHeight),
      Source::InstanceMethod("getWidth", &Source::GetWidth)
  });
}

Napi::Object Source::Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "Source"), GetClass(env));
  return exports;
}
