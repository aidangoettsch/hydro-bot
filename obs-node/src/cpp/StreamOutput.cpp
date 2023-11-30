#include "StreamOutput.h"

/**
 * Create a StreamOutput object. This object wraps the output of a video
 * encoder within OBS and passes encoded video data into Node.js as a 
 * stream.
 */
StreamOutput::StreamOutput(const Napi::CallbackInfo &info) : ObjectWrap(info) {
  Napi::Env env = info.Env();

  // Parse and type check arguments
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

  // Create an OBS settings object for this output. The ID stream_output represents
  // the output defined by the StreamOutputInternal class.
  auto outputId = new std::string("stream_output");
  obs_data_t *settings = obs_output_defaults(outputId->c_str());

  // Get the onData function passed in and add it to the OBS settings object
  Napi::Object callbacks = info[1].ToObject();
  Napi::Value onData = callbacks.Get("onData");
  if (!onData.IsFunction()) {
    Napi::TypeError::New(env, "onData must be a function")
        .ThrowAsJavaScriptException();
    return;
  }

  onDataRef = Napi::ThreadSafeFunction::New(
      env,
      onData.As<Napi::Function>(),
      "StreamOutput.onData",
      0,
      1
  );
  obs_data_set_int(settings, "onData", reinterpret_cast<long long int>(&onDataRef));

  // Get the onStop function passed in and add it to the OBS settings object
  Napi::Value onStop = callbacks.Get("onStop");
  if (!onStop.IsFunction()) {
    Napi::TypeError::New(env, "onStop must be a function")
        .ThrowAsJavaScriptException();
    return;
  }

  onStopRef = Napi::ThreadSafeFunction::New(
      env,
      onStop.As<Napi::Function>(),
      "StreamOutput.onData",
      0,
      1
  );
  obs_data_set_int(settings, "onStop", reinterpret_cast<long long int>(&onStopRef));

  // Pass in this object and an AsyncContext to allow us to call back into Node.js from the internal output
  auto jsThis = new Napi::ObjectReference(Napi::Persistent(env.Global()));
  obs_data_set_int(settings, "jsThis", reinterpret_cast<long long int>(jsThis));

  auto asyncContext = new Napi::AsyncContext(env, "streamOutput", jsThis->Value());
  obs_data_set_int(settings, "asyncContext", reinterpret_cast<long long int>(asyncContext));

  name = info[0].ToString().Utf8Value();
  outputReference = obs_output_create(outputId->c_str(), name.c_str(), settings, nullptr);

  delete outputId;
}

/**
 * Set the video encoder used to produce this output.
 */
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

  // Unwrap the object from Node.js into a pointer to the underlying C++ type and pass that encoder to OBS
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

/**
 * Set the audio encoder used to produce this output.
 */
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

  // Unwrap the object from Node.js into a pointer to the underlying C++ type and pass that encoder to OBS
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

/**
 * Set the audio mixer ID used to produce this output.
 */
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

/**
 * Update the callbacks registered for this output
 */
Napi::Value StreamOutput::UpdateSettings(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  // Get the current settings object
  if (!info[0].IsObject()) {}
  Napi::Object callbacks = info[0].ToObject();
  obs_data_t *settings = obs_output_get_settings(outputReference);

  // Get the callback pointers and update the settings object
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

  // Update the settings object
  obs_output_update(outputReference, settings);
  return env.Null();
}

/**
 * Start the output.
 */
Napi::Value StreamOutput::Start(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (!obs_output_start(outputReference)) {
    Napi::TypeError::New(env, "Could not start output")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  return env.Null();
}

/**
 * Stop the output.
 */
Napi::Value StreamOutput::Stop(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  obs_output_stop(outputReference);

  return env.Null();
}

/**
 * Define this class as a type exposed to Node.js .
 */
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

/**
 * Add this class to the exports of the module. 
 */
Napi::Object StreamOutput::Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "StreamOutput"), GetClass(env));
  return exports;
}
