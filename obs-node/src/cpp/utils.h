#pragma once

#include <iostream>
#define TRY_METHOD(method) \
    try { \
        method; \
    } catch (std::exception &e) { \
        Napi::Error::New(info.Env(), e.what()).ThrowAsJavaScriptException(); \
    } catch (...) { \
        Napi::Error::New(info.Env(), "Unexpected error.").ThrowAsJavaScriptException(); \
    }

inline int getNapiInt(Napi::Object object, const std::string &property) {
    auto value = object.Get(property);
    if (value.IsUndefined()) {
        throw std::invalid_argument(property + " should not be undefined");
    }
    return value.As<Napi::Number>();
}

inline std::string getNapiString(Napi::Object object, const std::string &property) {
    auto value = object.Get(property);
    if (value.IsUndefined()) {
        throw std::invalid_argument(property + " should not be undefined");
    }
    return value.As<Napi::String>();
}

inline std::string getNapiStringOrDefault(Napi::Object object, const std::string &property, const std::string &defaultValue) {
    auto value = object.Get(property);
    return value.IsUndefined() ? defaultValue : value.As<Napi::String>();
}

inline bool getNapiBoolean(Napi::Object object, const std::string &property) {
    auto value = object.Get(property);
    if (value.IsUndefined()) {
        throw std::invalid_argument(property + " should not be undefined");
    }
    return value.As<Napi::Boolean>();
}

inline obs_data_array_t* ArrayFromObject(Napi::Env env, Napi::Array array, obs_data_array_t *data = obs_data_array_create());

inline obs_data_t* DataFromObject(Napi::Env env, Napi::Object object, obs_data_t *data = obs_data_create()) {
  Napi::Array properties = object.GetPropertyNames();

  for (int i = 0, len = properties.Length(); i < len; i++) {
    Napi::Value key = properties.Get(Napi::Number::New(env, i));
    Napi::Value value = object.Get(key);

    if (!key.IsString()) continue;
    std::string keyString = key.ToString();

    if (value.IsString()) {
      obs_data_set_string(data, keyString.c_str(), value.ToString().Utf8Value().c_str());
    } else if (value.IsNumber()) {
      obs_data_set_int(data, keyString.c_str(), value.ToNumber().Int64Value());
    } else if (value.IsBoolean()) {
      obs_data_set_bool(data, keyString.c_str(), value.ToBoolean());
    } else if (value.IsArray()) {
      obs_data_set_array(data, keyString.c_str(), ArrayFromObject(env, value.As<Napi::Array>()));
    } else if (value.IsObject()) {
      obs_data_set_obj(data, keyString.c_str(), DataFromObject(env, value.ToObject()));
    }
  }

  return data;
}

inline obs_data_array_t* ArrayFromObject(Napi::Env env, Napi::Array array, obs_data_array_t *data) {
  for (int i = 0, len = array.Length(); i < len; i++) {
    Napi::Value value = array.Get(Napi::Number::New(env, i));

    if (value.IsObject()) {
      obs_data_array_insert(data, i, DataFromObject(env, value.ToObject()));
    }
  }

  return data;
}
