#pragma once

#include <napi.h>
#include <obs.h>

class SceneItem: public Napi::ObjectWrap<SceneItem> {
public:
  explicit SceneItem(const Napi::CallbackInfo &info);

  Napi::Value SetTransformInfo(const Napi::CallbackInfo &info);
  Napi::Value GetTransformInfo(const Napi::CallbackInfo &info);

  static Napi::Function GetClass(Napi::Env env);
  static Napi::Object Init(Napi::Env env, Napi::Object exports);

  obs_sceneitem_t *sceneItemReference = nullptr;

private:
  obs_transform_info transformInfo{};
};
