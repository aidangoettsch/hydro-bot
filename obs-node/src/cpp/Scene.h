#pragma once

#include "Source.h"
#include <napi.h>
#include <obs.h>
#include "utils.h"

class Scene: public Napi::ObjectWrap<Scene> {
public:
  explicit Scene(const Napi::CallbackInfo &info);
  ~Scene() override;

  Napi::Value AddSource(const Napi::CallbackInfo &info);
  Napi::Value AsSource(const Napi::CallbackInfo &info);

  static Napi::Function GetClass(Napi::Env env);
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

private:
  Napi::FunctionReference signalHandler;
  std::string name;
  obs_scene_t *sceneReference;
  obs_source_t *sourceReference;
};
