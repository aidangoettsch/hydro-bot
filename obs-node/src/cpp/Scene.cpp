#include "Scene.h"
#include "SceneItem.h"

Scene::Scene(const Napi::CallbackInfo &info): Napi::ObjectWrap<Scene>(info) {
  Napi::Env env = info.Env();

  if (info.Length() != 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return;
  }

  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be an string")
        .ThrowAsJavaScriptException();
    return;
  }

  name = info[0].ToString().Utf8Value();
  sceneReference = obs_scene_create(name.c_str());

  if (sceneReference == nullptr) {
    Napi::TypeError::New(env, "Could not create scene object")
        .ThrowAsJavaScriptException();
    return;
  }

  sourceReference = obs_scene_get_source(sceneReference);

  if (sourceReference == nullptr) {
    Napi::TypeError::New(env, "Could not create source object from scene")
        .ThrowAsJavaScriptException();
    return;
  }
}

Scene::~Scene() {
  obs_scene_release(sceneReference);
  obs_source_release(sourceReference);
}

Napi::Value Scene::AddSource(const Napi::CallbackInfo &info) {
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
    Source *source = Source::Unwrap(info[0].ToObject());

    obs_sceneitem_t *sceneItem = obs_scene_add(sceneReference, source->sourceReference);

    if (sceneItem == nullptr) {
      Napi::TypeError::New(env, "Could not add source to scene")
          .ThrowAsJavaScriptException();
      return env.Null();
    }

    Napi::Object napiSceneItem = SceneItem::GetClass(env).New(argumentList);
    SceneItem *sceneItemObject = SceneItem::Unwrap(napiSceneItem);
    sceneItemObject->sceneItemReference = sceneItem;

    return reinterpret_cast<Napi::Value &&>(napiSceneItem);
  } catch (const std::exception &e) {
    Napi::TypeError::New(env, "First argument must be a source object")
        .ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value Scene::AsSource(const Napi::CallbackInfo &info) {
  auto env = info.Env();
  argumentList = std::vector<napi_value>();

  argumentList.push_back(Napi::String::New(env, "scene"));
  argumentList.push_back(Napi::String::New(env, name));
  Napi::Object napiSource = Source::GetClass(env).New(argumentList);

  Source *sourceObject = Source::Unwrap(napiSource);
  sourceObject->sourceReference = sourceReference;

  return reinterpret_cast<Napi::Value &&>(napiSource);
}

Napi::Function Scene::GetClass(Napi::Env env) {
  return DefineClass(env, "Scene", {
     Scene::InstanceMethod("addSource", &Scene::AddSource),
     Scene::InstanceMethod("asSource", &Scene::AsSource)
  });
}

Napi::Object Scene::Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "Scene"), Scene::GetClass(env));
  return exports;
}
