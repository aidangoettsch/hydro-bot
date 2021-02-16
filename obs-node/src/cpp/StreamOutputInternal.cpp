#include "StreamOutputInternal.h"

StreamOutputInternal::StreamOutputInternal(obs_output_t *output, Napi::Function* onData) {
  this->output = output;
  this->onData = onData;
}

void StreamOutputInternal::LoadOutput() {
  outputId = std::string("stream_output").c_str();

  outputInfo.id = outputId;
  outputInfo.flags = OBS_OUTPUT_AV | OBS_OUTPUT_ENCODED;
  outputInfo.get_name = &StreamOutputInternal::GetName;

  obs_register_output(&outputInfo);
}

const char* StreamOutputInternal::GetName(void* typeData) {
  outputName = std::string("Stream Output").c_str();
  return outputName;
}

void* StreamOutputInternal::Create(obs_data_t *settings, obs_output_t *output) {
  long long onData = obs_data_get_int(settings, "onData");

  return new StreamOutputInternal(output,
                                  reinterpret_cast<Napi::Function *>(onData));
}

const char* StreamOutputInternal::Destroy(void* data) {
  delete reinterpret_cast<StreamOutputInternal *>(data);
}

const char* StreamOutputInternal::Start(void* data) {
  auto output = (StreamOutputInternal&&)(data);
}

const char* StreamOutputInternal::Stop(void* data) {
  auto output = (StreamOutputInternal&&)(data);
}

const char* StreamOutputInternal::OnPacket(void* data) {
  auto output = (StreamOutputInternal&&)(data);
}

const char* StreamOutputInternal::Update(void* data, obs_data_t* settings) {
  auto output = (StreamOutputInternal&&)(data);
  output.onData =
}
