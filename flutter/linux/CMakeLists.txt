cmake_minimum_required(VERSION 3.10)
project(anisurge2 LANGUAGES CXX)

set(BINARY_NAME "anisurge2")
set(APPLICATION_ID "com.r3ap3redit.anisurge2")

cmake_policy(SET CMP0063 NEW)

set(CMAKE_INSTALL_RPATH "$ORIGIN/lib")

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_POSITION_INDEPENDENT_CODE ON)

get_filename_component(FLUTTER_ROOT
  "${CMAKE_CURRENT_SOURCE_DIR}/../.flutter-plugins-dependencies"
  DIRECTORY
)
get_filename_component(FLUTTER_ROOT "${FLUTTER_ROOT}" ABSOLUTE)

add_subdirectory(${FLUTTER_ROOT}/packages/flutter_tools/linux flutter)

add_executable(${BINARY_NAME}
  "main.cc"
  "my_application.cc"
)

apply_standard_settings(${BINARY_NAME})

target_link_libraries(${BINARY_NAME} PRIVATE flutter)
target_link_libraries(${BINARY_NAME} PRIVATE PkgConfig::GTK)

add_dependencies(${BINARY_NAME} flutter_assemble)

install(TARGETS ${BINARY_NAME} RUNTIME DESTINATION "${CMAKE_INSTALL_BINDIR}")

install(FILES "${FLUTTER_LIBRARY}" DESTINATION "${CMAKE_INSTALL_LIBDIR}")

set(INSTALL_BUNDLE_DATA_DIR "${CMAKE_INSTALL_PREFIX}/share/${BINARY_NAME}")
set(INSTALL_BUNDLE_LIB_DIR "${INSTALL_BUNDLE_DATA_DIR}/lib")

install(CODE "
  file(GET_RUNTIME_DEPENDENCIES
    EXECUTABLES \$<TARGET_FILE:${BINARY_NAME}>
    RESOLVED_DEPENDENCIES_VAR DEPENDENCIES
    UNRESOLVED_DEPENDENCIES_VAR UNRESOLVED_DEPENDENCIES
  )
  list(APPEND DEPENDENCIES \"${FLUTTER_LIBRARY}\")
  file(INSTALL
    DESTINATION \"${INSTALL_BUNDLE_LIB_DIR}\"
    TYPE SHARED_LIBRARY
    FOLLOW_SYMLINK_CHAIN
    FILES \${DEPENDENCIES}
  )
" COMPONENT Runtime)

install(FILES "${CMAKE_CURRENT_BINARY_DIR}/flutter_assets"
  DESTINATION "${INSTALL_BUNDLE_DATA_DIR}"
  COMPONENT Runtime)
