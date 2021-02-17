#include "StreamOutput.h"

StreamOutput::StreamOutput(const Napi::CallbackInfo &info) : ObjectWrap(info) {
  Napi::Env env = info.Env();

  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string")
        .ThrowAsJavaScriptException();
    return;
  }

  if (!info[1].IsObject()) {
    Napi::TypeError::New(env, "Second argument must be an object")
        .ThrowAsJavaScriptException();
    return;
  }

  auto outputId = new std::string("stream_output");
  Napi::Object callbacks = info[1].ToObject();

  obs_data_t *settings = obs_output_defaults(outputId->c_str());

  Napi::Value onData = callbacks.Get("onData");
  if (!onData.IsFunction()) {
    Napi::TypeError::New(env, "onData")
        .ThrowAsJavaScriptException();
    return;
  }
  obs_data_set_int(settings, "onData", reinterpret_cast<long long int>(&onData));

  Napi::Value onStop = callbacks.Get("onStop");
  if (!onStop.IsFunction()) {
    Napi::TypeError::New(env, "onStop")
        .ThrowAsJavaScriptException();
    return;
  }
  obs_data_set_int(settings, "onStop", reinterpret_cast<long long int>(&onStop));

  obs_data_set_int(settings, "env", reinterpret_cast<long long int>(&env));

  name = info[0].ToString().Utf8Value();
  outputReference = obs_output_create(outputId->c_str(), name.c_str(), settings, nullptr);

  delete outputId;
}

Napi::Value StreamOutput::SetVideoEncoder(const Napi::CallbackInfo &info) {
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

Napi::Value StreamOutput::SetAudioEncoder(const Napi::CallbackInfo &info) {
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

Napi::Value StreamOutput::SetMixer(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!info[0].IsNumber()) {
    Napi::TypeError::New(env, "First argument must be a number")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  obs_output_set_mixer(outputReference, info[0].ToNumber().Int64Value());

  return env.Null();
}

Napi::Value StreamOutput::UpdateSettings(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!info[0].IsObject()) {}
  Napi::Object callbacks = info[0].ToObject();
  obs_data_t *settings = obs_output_get_settings(outputReference);

  Napi::Value onData = callbacks.Get("onData");
  if (onData.IsFunction()) {
    Napi::FunctionReference onDataRef = Napi::Persistent(onData.As<Napi::Function>());
    obs_data_set_int(settings, "onData", reinterpret_cast<long long int>(&onDataRef));
  }

  Napi::Value onStop = callbacks.Get("onStop");
  if (onStop.IsFunction()) {
    Napi::FunctionReference onStopRef = Napi::Persistent(onStop.As<Napi::Function>());
    obs_data_set_int(settings, "onStop", reinterpret_cast<long long int>(&onStopRef));
  }

  obs_output_update(outputReference, settings);
  return env.Null();
}

Napi::Value StreamOutput::Start(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!obs_output_start(outputReference)) {
    Napi::TypeError::New(env, "Could not start output")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Null();
}

Napi::Value StreamOutput::Stop(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  obs_output_stop(outputReference);

  return env.Null();
}

Napi::Function StreamOutput::GetClass(Napi::Env env) {
  return DefineClass(env, "StreamOutput", {
      StreamOutput::InstanceMethod("setVideoEncoder", &StreamOutput::SetVideoEncoder),
      StreamOutput::InstanceMethod("setAudioEncoder", &StreamOutput::SetAudioEncoder),
      StreamOutput::InstanceMethod("setMixer", &StreamOutput::SetMixer),
      StreamOutput::InstanceMethod("updateSettings", &StreamOutput::UpdateSettings),
      StreamOutput::InstanceMethod("start", &StreamOutput::Start),
      StreamOutput::InstanceMethod("stop", &StreamOutput::Stop)
  });
}

Napi::Object StreamOutput::Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "StreamOutput"), GetClass(env));
  return exports;
}
