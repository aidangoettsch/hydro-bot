#include "StreamOutputInternal.h"

StreamOutputInternal::StreamOutputInternal(obs_output_t *output, Napi::FunctionReference* onData, Napi::FunctionReference* onStop, Napi::Env* env) {
  this->output = output;
  this->onData = onData;
  this->onStop = onStop;
  this->env = env;
}

void StreamOutputInternal::LoadOutput() {
  obs_register_output(&outputInfo);
}

const char* StreamOutputInternal::GetName([[maybe_unused]] void* typeData) {
  return outputName;
}

void* StreamOutputInternal::Create(obs_data_t *settings, obs_output_t *output) {
  long long onData = obs_data_get_int(settings, "onData");
  long long onStop = obs_data_get_int(settings, "onStop");
  long long env = obs_data_get_int(settings, "env");

  return new StreamOutputInternal(output, reinterpret_cast<Napi::FunctionReference *>(onData), reinterpret_cast<Napi::FunctionReference *>(onStop), reinterpret_cast<Napi::Env *>(env));
}

void StreamOutputInternal::Destroy(void* data) {
  delete reinterpret_cast<StreamOutputInternal *>(data);
}

bool StreamOutputInternal::Start([[maybe_unused]] void* data) {
  auto output = (StreamOutputInternal&&)(data);

  blog(LOG_INFO, "starting stream output");
  blog(LOG_INFO, "%ld", output.output);
  if (!obs_output_can_begin_data_capture(output.output, 0)) {
    return false;
  }
  if (!obs_output_initialize_encoders(output.output, 0)) {
    return false;
  }
  blog(LOG_INFO, "actually starting stream output");
  return obs_output_begin_data_capture(output.output, 0);
}

void StreamOutputInternal::Stop(void* data, [[maybe_unused]] uint64_t ts) {
  auto output = (StreamOutputInternal&&)(data);
  obs_output_end_data_capture(output.output);

  if (output.onStop != nullptr) {
    std::vector<napi_value>* stopArgs = new std::vector<napi_value>();
    output.onStop->Call(*stopArgs);
    delete stopArgs;
  }
}

void StreamOutputInternal::OnPacket(void* data, encoder_packet *packet) {
  auto output = (StreamOutputInternal&&)(data);
//  blog(LOG_INFO, "onData*: %ld", output.onData);
  blog(LOG_INFO, "size: %ld", packet->size);

  if (output.onData != nullptr) {
    std::vector<napi_value>* listenerArgs = new std::vector<napi_value>();
    auto buffer =
        Napi::Buffer<uint8_t>::New(*output.env, packet->data, packet->size);

    listenerArgs->push_back(buffer);
    output.onData->Call(*listenerArgs);
    delete listenerArgs;
  }
}

void StreamOutputInternal::Update(void* data, obs_data_t* settings) {
  auto output = (StreamOutputInternal&&)(data);
  long long onData = obs_data_get_int(settings, "onData");

  output.onData = reinterpret_cast<Napi::FunctionReference *>(onData);
}
