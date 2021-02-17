#pragma once

#include <napi.h>
#include "AudioEncoder.h"
#include "Output.h"
#include "OutputService.h"
#include "Scene.h"
#include "SceneItem.h"
#include "Source.h"
#include "Scene.h"
#include "StreamOutput.h"
#include "Studio.h"
#include "VideoEncoder.h"

Napi::Object Init(Napi::Env env, Napi::Object exports);
