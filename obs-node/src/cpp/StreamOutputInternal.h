#pragma once
#include <napi.h>
#include <obs.h>

class StreamOutputInternal {
public:
  static void LoadOutput();

private:
  explicit StreamOutputInternal(obs_output_t *output, Napi::Function* onData);

  static const char* GetName(void* typeData);
  static void* Create(obs_data_t *settings, obs_output_t *output);
  static const char* Destroy(void* data);
  static const char* Start(void* data);
  static const char* Stop(void* data);
  static const char* OnPacket(void* data);
  static const char* Update(void* data, obs_data_t* settings);

  Napi::Function* onData;
  obs_output_t *output;

  static const char* outputId;
  static const char* outputName;
  static obs_output_info outputInfo;
};
