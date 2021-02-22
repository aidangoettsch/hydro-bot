#pragma once
#include <napi.h>
#include <obs.h>
#include "StreamOutput.h"

class StreamOutputInternal {
public:
  static void LoadOutput();

private:
  explicit StreamOutputInternal(
      obs_output_t *output,
      Napi::ThreadSafeFunction* onData,
      Napi::ThreadSafeFunction* onStop,
      Napi::ObjectReference* jsThis,
      Napi::AsyncContext* asyncContext
    );

  static const char* GetName([[maybe_unused]] void* typeData);
  static void* Create(obs_data_t *settings, obs_output_t *output);
  static void Destroy(void* data);
  static bool Start([[maybe_unused]] void* data);
  static void Stop(void* data, [[maybe_unused]] uint64_t ts);
  static void OnPacket(void* data, encoder_packet *packet);
  static void Update(void* data, obs_data_t* settings);

  static constexpr char const* outputId = "stream_output";
  static constexpr char const* outputName = "Stream Output";

  constexpr static obs_output_info outputInfo = {
    .id = outputId,
    .flags = OBS_OUTPUT_AV | OBS_OUTPUT_ENCODED,
    .get_name = &GetName,
    .create = &Create,
    .destroy = &Destroy,
    .start = &Start,
    .stop = &Stop,
    .encoded_packet = &OnPacket
  };

  Napi::ThreadSafeFunction* onData;
  Napi::ThreadSafeFunction* onStop;
  Napi::ObjectReference* jsThis;
  Napi::AsyncContext* asyncContext;
  obs_output_t *output;
};
