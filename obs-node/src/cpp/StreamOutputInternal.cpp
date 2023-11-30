#include "StreamOutputInternal.h"

/**
 * Constructor for StreamOutputInternal. This class is responsible for interacting
 * with OBS to pretend to be a streaming service and pass video data into Node.js.
 */
StreamOutputInternal::StreamOutputInternal(
  obs_output_t *output,
  Napi::ThreadSafeFunction* onData,
  Napi::ThreadSafeFunction* onStop,
  Napi::ObjectReference* jsThis,
  Napi::AsyncContext* asyncContext
) {
  // output is a pointer to the OBS API struct representing this output
  this->output = output;
  // The other member variables are the Node.js callbacks and the information
  // needed to call them.
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

/**
 * Create a new StreamOutputInternal. This is a static function enrolled with OBS to
 * be called when StreamOutput requests the output be created.
 */
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

/**
 * Destroy a StreamOutputInternal. This is a static function enrolled with OBS to
 * be called when the output should be freed.
 */
void StreamOutputInternal::Destroy(void* data) {
  delete reinterpret_cast<StreamOutputInternal *>(data);
}

/**
 * Start the output by calling the OBS API.
 */
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

/**
 * Stop the output by calling the OBS API.
 */
void StreamOutputInternal::Stop(void* data, [[maybe_unused]] uint64_t ts) {
  auto output = (StreamOutputInternal*)(data);
  obs_output_end_data_capture(output->output);

  if (output->onStop != nullptr) {
    output->onStop->BlockingCall();
  }
}

/**
 * 
 */
void StreamOutputInternal::OnPacket(void* data, encoder_packet *packet) {
  auto output = (StreamOutputInternal*)(data);

  if (output->onData != nullptr) {
    // Packets are reference counted objects, so create a new reference for this packet.
    auto packetRef = new encoder_packet();
    obs_encoder_packet_ref(packetRef, packet);

    // Call the onData function in Node.js. The lambda is responsible for actually performing the call
    // with access to the environment of the function, which is required to create objects that are properly
    // tracked by the runtime.
    output->onData->BlockingCall(packetRef, [](Napi::Env env, Napi::Function jsCallback, encoder_packet *data) {
      // Create a Node.js Buffer and copy data into it
      auto array = Napi::ArrayBuffer::New(env, data->size);
      memcpy(array.Data(), data->data, data->size);
      
      // Do the actual function call, passing the data and the type of the packet.
      jsCallback.Call( {array, Napi::Number::New(env, data->type)} );

      // Release the reference we hold on the packet
      obs_encoder_packet_release(data);
      delete data;
    });
  }
}

/**
 * Update callbacks if they have changed.
 */
void StreamOutputInternal::Update(void* data, obs_data_t* settings) {
  auto output = (StreamOutputInternal*)(data);
  long long onData = obs_data_get_int(settings, "onData");

  output->onData = reinterpret_cast<Napi::ThreadSafeFunction *>(onData);
}
