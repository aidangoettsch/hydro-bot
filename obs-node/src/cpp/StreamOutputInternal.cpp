#include "StreamOutputInternal.h"

StreamOutputInternal::StreamOutputInternal(
  obs_output_t *output,
  Napi::ThreadSafeFunction* onData,
  Napi::ThreadSafeFunction* onStop,
  Napi::ObjectReference* jsThis,
  Napi::AsyncContext* asyncContext
) {
  this->output = output;
  this->onData = onData;
  this->onStop = onStop;
  this->jsThis = jsThis;
  this->asyncContext = asyncContext;
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
  long long jsThis = obs_data_get_int(settings, "jsThis");
  long long asyncContext = obs_data_get_int(settings, "asyncContext");

  auto data = new StreamOutputInternal(
    output,
    reinterpret_cast<Napi::ThreadSafeFunction *>(onData),
    reinterpret_cast<Napi::ThreadSafeFunction *>(onStop),
    reinterpret_cast<Napi::ObjectReference *>(jsThis),
    reinterpret_cast<Napi::AsyncContext *>(asyncContext)
  );
  return data;
}

void StreamOutputInternal::Destroy(void* data) {
  delete reinterpret_cast<StreamOutputInternal *>(data);
}

bool StreamOutputInternal::Start(void* data) {
  auto output = (StreamOutputInternal*)(data);

  if (!obs_output_can_begin_data_capture(output->output, 0)) {
    return false;
  }
  if (!obs_output_initialize_encoders(output->output, 0)) {
    return false;
  }
  return obs_output_begin_data_capture(output->output, 0);
}

void StreamOutputInternal::Stop(void* data, [[maybe_unused]] uint64_t ts) {
  auto output = (StreamOutputInternal*)(data);
  obs_output_end_data_capture(output->output);

  if (output->onStop != nullptr) {
    output->onStop->BlockingCall();
  }
}

void StreamOutputInternal::OnPacket(void* data, encoder_packet *packet) {
  auto output = (StreamOutputInternal*)(data);

  if (output->onData != nullptr) {
    auto packetRef = new encoder_packet();
    obs_encoder_packet_ref(packetRef, packet);
    output->onData->BlockingCall(packetRef, []( Napi::Env env, Napi::Function jsCallback, encoder_packet *data ) {
      auto array = Napi::ArrayBuffer::New(env, data->size);
      memcpy(array.Data(), data->data, data->size);
      jsCallback.Call( {array, Napi::Number::New(env, data->type)} );
      obs_encoder_packet_release(data);
      delete data;
    });
  }
}

void StreamOutputInternal::Update(void* data, obs_data_t* settings) {
  auto output = (StreamOutputInternal*)(data);
  long long onData = obs_data_get_int(settings, "onData");

  output->onData = reinterpret_cast<Napi::ThreadSafeFunction *>(onData);
}
