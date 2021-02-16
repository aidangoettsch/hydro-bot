#include <napi.h>
#include <obs.h>

class VideoSettings {
public:
  static obs_video_info* FromObject(Napi::Env env, Napi::Object object);
};

class AudioSettings {
public:
  static obs_audio_info* FromObject(Napi::Env env, Napi::Object object);
};
