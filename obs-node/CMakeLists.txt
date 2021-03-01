cmake_minimum_required(VERSION 3.13)
project(obs-node)

set(CMAKE_CXX_STANDARD 17)

if (NOT OBS_STUDIO_DIR)
    set(OBS_STUDIO_DIR ${CMAKE_CURRENT_SOURCE_DIR}/obs-studio-build/obs-installed)
endif()

message(STATUS "'OBS_STUDIO_DIR' = ${OBS_STUDIO_DIR}")

# Include QT for linux
if(UNIX AND NOT APPLE)
    find_package(Qt5X11Extras REQUIRED)
    find_package(X11 REQUIRED)
    find_package(Qt5Widgets ${FIND_MODE})
    if(NOT Qt5Widgets_FOUND)
        message(FATAL_ERROR "Failed to find Qt5")
    endif()
endif()

# Build
SET(OBS_NODE_SOURCES
    src/cpp/Studio.cpp
    src/cpp/Settings.cpp
    src/cpp/Scene.cpp
    src/cpp/SceneItem.cpp
    src/cpp/Source.cpp
    src/cpp/AudioEncoder.cpp
    src/cpp/VideoEncoder.cpp
    src/cpp/Output.cpp
    src/cpp/OutputService.cpp
    src/cpp/main.cpp
    src/cpp/StreamOutputInternal.cpp
    src/cpp/StreamOutput.cpp)

add_library(${PROJECT_NAME} SHARED ${OBS_NODE_SOURCES} ${CMAKE_JS_SRC})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# Include
execute_process(COMMAND node -p "require('node-addon-api').include"
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE NODE_ADDON_API_DIR
)
string(REPLACE "\n" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})

target_include_directories(${PROJECT_NAME} PRIVATE
        ${CMAKE_JS_INC}
        ${NODE_ADDON_API_DIR}
        ${OBS_STUDIO_DIR}/include
)

# Linking
if (APPLE)
    LIST(APPEND OBS_NODE_DEPS
        ${OBS_STUDIO_DIR}/bin/libobs.dylib
    )
elseif(UNIX)
    LIST(APPEND OBS_NODE_DEPS
        ${OBS_STUDIO_DIR}/bin/64bit/libobs.so
        Qt5::Widgets
        X11
    )
elseif(WIN32)
    LIST(APPEND OBS_NODE_DEPS
        ${OBS_STUDIO_DIR}/bin/64bit/obs.lib
    )
endif()

target_link_libraries(${PROJECT_NAME}
        ${CMAKE_JS_LIB}
        ${OBS_NODE_DEPS}
)