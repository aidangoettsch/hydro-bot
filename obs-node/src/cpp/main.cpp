#include "main.h"

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  AudioEncoder::Init(env, exports);
  Output::Init(env, exports);
  OutputService::Init(env, exports);
  Scene::Init(env, exports);
  SceneItem::Init(env, exports);
  Source::Init(env, exports);
  Scene::Init(env, exports);
  StreamOutput::Init(env, exports);
  Studio::Init(env, exports);
  VideoEncoder::Init(env, exports);

  return exports;
}

NODE_API_MODULE(obs_node, Init);
