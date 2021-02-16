#include "SceneItem.h"
#include "utils.h"

SceneItem::SceneItem(const Napi::CallbackInfo &info)
    : ObjectWrap(info) {
  memset(&transformInfo, 0, sizeof transformInfo);
}

Napi::Value SceneItem::SetTransformInfo(const Napi::CallbackInfo &info) {
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

  try {
    Napi::Object obj = info[0].ToObject();
    transformInfo.pos.x = obj.Get("posX").ToNumber();
    transformInfo.pos.y = obj.Get("posY").ToNumber();
    transformInfo.rot = obj.Get("rot").ToNumber();
    transformInfo.scale.x = obj.Get("scaleX").ToNumber();
    transformInfo.scale.y = obj.Get("scaleY").ToNumber();
    transformInfo.alignment = obj.Get("alignment").ToNumber();
    transformInfo.bounds_type = (obs_bounds_type) obj.Get("boundsType").ToNumber().Int64Value();
    transformInfo.bounds_alignment = obj.Get("boundsAlignment").ToNumber();
    transformInfo.bounds.x = obj.Get("boundsX").ToNumber();
    transformInfo.bounds.y = obj.Get("boundsY").ToNumber();
  } catch (const std::exception &e) {
    Napi::TypeError::New(env, "First argument must be transform info")
        .ThrowAsJavaScriptException();
    return env.Null();
  }

  obs_sceneitem_set_info(sceneItemReference, &transformInfo);
  return env.Null();
}

Napi::Value SceneItem::GetTransformInfo(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  obs_sceneitem_get_info(sceneItemReference, &transformInfo);

  Napi::Object res = Napi::Object::New(env);
  res.Set("posX", Napi::Number::New(env, transformInfo.pos.x));
  res.Set("posY", Napi::Number::New(env, transformInfo.pos.y));
  res.Set("rot", Napi::Number::New(env, transformInfo.rot));
  res.Set("scaleX", Napi::Number::New(env, transformInfo.scale.x));
  res.Set("scaleY", Napi::Number::New(env, transformInfo.scale.y));
  res.Set("alignment", Napi::Number::New(env, transformInfo.alignment));
  res.Set("boundsType", Napi::Number::New(env, transformInfo.bounds_type));
  res.Set("boundsAlignment", Napi::Number::New(env, transformInfo.bounds_alignment));
  res.Set("boundsX", Napi::Number::New(env, transformInfo.bounds.x));
  res.Set("boundsY", Napi::Number::New(env, transformInfo.bounds.y));

  return reinterpret_cast<Napi::Value &&>(res);
}

Napi::Function SceneItem::GetClass(Napi::Env env) {
  return DefineClass(env, "SceneItem", {
    SceneItem::InstanceMethod("setTransformInfo", &SceneItem::SetTransformInfo),
    SceneItem::InstanceMethod("getTransformInfo", &SceneItem::GetTransformInfo),
  });
}

Napi::Object SceneItem::Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "SceneItem"), SceneItem::GetClass(env));
  return exports;
}
