#include "Settings.h"
#include <iostream>

obs_video_info* VideoSettings::FromObject(Napi::Env env, Napi::Object object) {
  auto* ovi = static_cast<obs_video_info *>(malloc(sizeof(obs_video_info)));
  memset(ovi, 0, sizeof(obs_video_info));
  ovi->adapter = 0;
#ifdef _WIN32
  ovi->graphics_module = "libobs-opengl.dll";
#else
  ovi->graphics_module = "libobs-opengl.so";
#endif
  ovi->output_format = VIDEO_FORMAT_I420;
  ovi->colorspace = VIDEO_CS_709;
  ovi->range = VIDEO_RANGE_PARTIAL;

  auto fpsNum = object.Get("fps");
  if (!fpsNum.IsNumber()) {
    Napi::TypeError::New(env, "Argument fps must be a number")
        .ThrowAsJavaScriptException();
    return ovi;
  }
  ovi->fps_num = fpsNum.ToNumber();
  ovi->fps_den = 1;

  auto baseWidth = object.Get("baseWidth");
  if (!baseWidth.IsNumber()) {
    Napi::TypeError::New(env, "Argument baseWidth must be a number")
        .ThrowAsJavaScriptException();
    return ovi;
  }
  ovi->base_width = baseWidth.ToNumber();

  auto baseHeight = object.Get("baseHeight");
  if (!baseHeight.IsNumber()) {
    Napi::TypeError::New(env, "Argument baseHeight must be a number")
        .ThrowAsJavaScriptException();
    return ovi;
  }
  ovi->base_height = baseHeight.ToNumber();

  auto outputWidth = object.Get("outputWidth");
  if (!outputWidth.IsNumber()) {
    Napi::TypeError::New(env, "Argument outputWidth must be a number")
        .ThrowAsJavaScriptException();
    return ovi;
  }
  ovi->output_width = outputWidth.ToNumber();

  auto outputHeight = object.Get("outputHeight");
  if (!outputHeight.IsNumber()) {
    Napi::TypeError::New(env, "Argument outputHeight must be a number")
        .ThrowAsJavaScriptException();
    return ovi;
  }
  ovi->output_height = outputHeight.ToNumber();
  ovi->gpu_conversion = true; // always be true for the OBS issue
  return ovi;
}

obs_audio_info* AudioSettings::FromObject(Napi::Env env, Napi::Object object) {
  auto* oai = static_cast<obs_audio_info *>(malloc(sizeof(obs_audio_info)));
  memset(oai, 0, sizeof(obs_audio_info));

  auto sampleRate = object.Get("sampleRate");
  if (!sampleRate.IsNumber()) {
    Napi::TypeError::New(env, "Argument sampleRate must be a number")
        .ThrowAsJavaScriptException();
    return oai;
  }
  oai->samples_per_sec = sampleRate.ToNumber();

  auto speakers = object.Get("speakers");
  if (!speakers.IsNumber()) {
    Napi::TypeError::New(env, "Argument speakers must be a number")
        .ThrowAsJavaScriptException();
    return oai;
  }
  oai->speakers = (speaker_layout)speakers.ToNumber().Int64Value();

  return oai;
}
