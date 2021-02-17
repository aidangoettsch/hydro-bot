#include "Studio.h"
#include "Settings.h"
#include "StreamOutputInternal.h"
#include "utils.h"
#include <obs.h>

#ifdef __linux__
// Need QT for linux to setup OpenGL properly.
#include <QApplication>
#include <QPushButton>
#include <filesystem>
#include <iostream>
QApplication *qApplication;
#endif

std::string obsPath;
obs_video_info* videoSettings;
obs_audio_info* audioSettings;

Napi::Value Studio::Startup(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (info.Length() != 2) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be a string")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[1].IsString()) {
    Napi::TypeError::New(env, "Second argument must be a string")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  obsPath = info[0].As<Napi::String>().Utf8Value();
  auto currentWorkDir = std::filesystem::current_path();
  // Change work directory to obs bin path to setup obs properly.
  blog(LOG_INFO, "Set work directory to %s for loading obs data", GetObsBinPath().c_str());
  std::filesystem::current_path(GetObsBinPath());

  auto restore = [&] {
    std::filesystem::current_path(currentWorkDir);
  };

  bool startup = obs_startup(info[1].As<Napi::String>().Utf8Value().c_str(), nullptr, nullptr);

  if (!startup || !obs_initialized()) {
    Napi::TypeError::New(env, "Could not initialize OBS.")
        .ThrowAsJavaScriptException();
    restore();
    return env.Null();
  }

  LoadModule("image-source");
  LoadModule("obs-ffmpeg");
  LoadModule("obs-filters");
  LoadModule("obs-outputs");
  LoadModule("obs-transitions");
  LoadModule("obs-x264");
  LoadModule("rtmp-services");
  LoadModule("text-freetype2");
  LoadModule("vlc-video");
  StreamOutputInternal::LoadOutput();

  obs_post_load_modules();

  restore();
  return info.Env().Null();
}

Napi::Value Studio::Shutdown(const Napi::CallbackInfo &info) {
  obs_shutdown();
  free(videoSettings);
  free(audioSettings);

  return info.Env().Null();
}

Napi::Value Studio::ResetVideo(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (info.Length() != 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "First argument must be an object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto currentWorkDir = std::filesystem::current_path();
  // Change work directory to obs bin path to setup obs properly.
  blog(LOG_INFO, "Set work directory to %s for loading obs data", GetObsBinPath().c_str());
  std::filesystem::current_path(GetObsBinPath());

  auto restore = [&] {
    std::filesystem::current_path(currentWorkDir);
  };

  videoSettings = VideoSettings::FromObject(env, info[0].As<Napi::Object>());
  int result = obs_reset_video(videoSettings);
  if (result == OBS_VIDEO_NOT_SUPPORTED) {
    Napi::Error::New(env, "The adapter lacks capabilities")
        .ThrowAsJavaScriptException();
  } else if (result == OBS_VIDEO_INVALID_PARAM) {
    Napi::Error::New(env, "A parameter is invalid")
        .ThrowAsJavaScriptException();
  } else if (result == OBS_VIDEO_CURRENTLY_ACTIVE) {
    Napi::Error::New(env, "Video is currently active")
        .ThrowAsJavaScriptException();
  } else if (result == OBS_VIDEO_MODULE_NOT_FOUND) {
    Napi::Error::New(env, "The graphics module is not found")
        .ThrowAsJavaScriptException();
  } else if (result == OBS_VIDEO_FAIL) {
    Napi::Error::New(env, "Generic failure resetting video")
        .ThrowAsJavaScriptException();
  }
  restore();
  return env.Null();
}

Napi::Value Studio::ResetAudio(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  if (info.Length() != 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  if (!info[0].IsObject()) {
    Napi::TypeError::New(env, "First argument must be an object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  auto currentWorkDir = std::filesystem::current_path();
  // Change work directory to obs bin path to setup obs properly.
  blog(LOG_INFO, "Set work directory to %s for loading obs data", GetObsBinPath().c_str());
  std::filesystem::current_path(GetObsBinPath());

  auto restore = [&] {
    std::filesystem::current_path(currentWorkDir);
  };

  audioSettings = AudioSettings::FromObject(env, info[0].As<Napi::Object>());
  if (!obs_reset_audio(audioSettings)) {
    Napi::Error::New(env, "Failure resetting audio")
        .ThrowAsJavaScriptException();
  }
  restore();
  return env.Null();
}

Napi::Object Studio::Init(Napi::Env env, Napi::Object exports) {
  Napi::Object studioObject = Napi::Object::New(env);
  studioObject.Set(Napi::String::New(env, "startup"), Napi::Function::New(env, Startup));
  studioObject.Set(Napi::String::New(env, "resetVideo"), Napi::Function::New(env, ResetVideo));
  studioObject.Set(Napi::String::New(env, "resetAudio"), Napi::Function::New(env, ResetAudio));

  exports.Set(Napi::String::New(env, "Studio"), studioObject);
  return exports;
}

void Studio::LoadModule(const std::string& moduleName) {
  obs_module_t *module = nullptr;

#ifdef _WIN32
  std::string binPath = GetObsPluginPath() + "\\" + moduleName + ".dll";
  std::string dataPath = GetObsPluginDataPath() + "\\" + moduleName;
#else
  std::string binPath = GetObsPluginPath() + "/" + moduleName + ".so";
  std::string dataPath = GetObsPluginDataPath() + "/" + moduleName;
#endif
  int code = obs_open_module(&module, binPath.c_str(), dataPath.c_str());
  if (code != MODULE_SUCCESS) {
    throw std::runtime_error("Failed to load module '" + binPath + "'");
  }
  if (!obs_init_module(module)) {
    throw std::runtime_error("Failed to load module '" + binPath + "'");
  }
}

std::string Studio::GetObsBinPath() {
#ifdef _WIN32
  return obsPath + "\\bin\\64bit";
#elif __linux__
  return obsPath + "/bin/64bit";
#else
  return obsPath + "/bin";
#endif
}

std::string Studio::GetObsPluginPath() {
#ifdef _WIN32
  // Obs plugin path is same with bin path, due to SetDllDirectoryW called in obs-studio/libobs/util/platform-windows.c.
  return obsPath + "\\bin\\64bit";
#elif __linux__
  return obsPath + "/obs-plugins/64bit";
#else
  return obsPath + "/obs-plugins";
#endif
}

std::string Studio::GetObsPluginDataPath() {
#ifdef _WIN32
  return obsPath + "\\data\\obs-plugins";
#else
  return obsPath + "/data/obs-plugins";
#endif
}
