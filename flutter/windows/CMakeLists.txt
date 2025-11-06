cmake_minimum_required(VERSION 3.14)
project(anisurge2 LANGUAGES CXX)

set(BINARY_NAME "anisurge2")

cmake_policy(SET CMP0063 NEW)

set(CMAKE_INSTALL_RPATH "$ORIGIN/lib")

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

get_filename_component(FLUTTER_ROOT
  "${CMAKE_CURRENT_SOURCE_DIR}/../.flutter-plugins-dependencies"
  DIRECTORY
)
get_filename_component(FLUTTER_ROOT "${FLUTTER_ROOT}" ABSOLUTE)

add_subdirectory(${FLUTTER_ROOT}/packages/flutter_tools/windows flutter)

add_executable(${BINARY_NAME} WIN32
  "flutter_window.cpp"
  "main.cpp"
  "utils.cpp"
  "win32_window.cpp"
  "${FLUTTER_MANAGED_DIR}/generated_plugin_registrant.cc"
  "Runner.rc"
  "runner.exe.manifest"
)

apply_standard_settings(${BINARY_NAME})

target_compile_definitions(${BINARY_NAME} PRIVATE "NOMINMAX")

target_link_libraries(${BINARY_NAME} PRIVATE flutter flutter_wrapper_app)

target_include_directories(${BINARY_NAME} PRIVATE "${CMAKE_SOURCE_DIR}")

add_dependencies(${BINARY_NAME} flutter_assemble)
