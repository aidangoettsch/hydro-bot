#include "Scene.h"
#include "SceneItem.h"

Scene::Scene(const Napi::CallbackInfo &info): Napi::ObjectWrap<Scene>(info) {
  Napi::Env env = info.Env();

  if (info.Length() < 1) {
    Napi::TypeError::New(env, "Wrong number of arguments")
        .ThrowAsJavaScriptException();
    return;
  }

  if (!info[0].IsString()) {
    Napi::TypeError::New(env, "First argument must be an string")
        .ThrowAsJavaScriptException();
    return;
  }

  if (!info[1].IsFunction() && !info[1].IsNull() && !info[1].IsUndefined()) {
    Napi::TypeError::New(env, "Second argument must be a function or null")
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

  obs_source_addref(sourceReference);

  signalHandler = Napi::Persistent(info[1].As<Napi::Function>());
}

Scene::~Scene() {
  if (sourceReference != nullptr) obs_source_release(sourceReference);
  if (sceneReference != nullptr) obs_scene_release(sceneReference);
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
    Source *source = Source::Unwrap(info[0].ToObject().Get("source").ToObject());

    obs_sceneitem_t *sceneItem = obs_scene_add(sceneReference, source->sourceReference);
    obs_sceneitem_addref(sceneItem);

    if (sceneItem == nullptr) {
      Napi::TypeError::New(env, "Could not add source to scene")
          .ThrowAsJavaScriptException();
      return env.Null();
    }

    Napi::Object napiSceneItem = SceneItem::GetClass(env).New( {Napi::String::New(env, "")} );
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

  Napi::Object napiSource = Source::GetClass(env).New( {
      Napi::String::New(env, "scene"),
      Napi::String::New(env, name),
      signalHandler.Value(),
  } );

  Source *sourceObject = Source::Unwrap(napiSource);
  sourceObject->sourceReference = sourceReference;
  obs_source_addref(sourceReference);
  sourceObject->SetupSignalHandler();

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
