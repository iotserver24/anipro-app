#include "utils.h"

#include <windows.h>
#include <io.h>
#include <iostream>

void CreateAndAttachConsole() {
  if (::AllocConsole()) {
    FILE* unused;
    if (freopen_s(&unused, "CONOUT$", "w", stdout)) {
      _dup2(_fileno(stdout), 1);
    }
    if (freopen_s(&unused, "CONOUT$", "w", stderr)) {
      _dup2(_fileno(stdout), 2);
    }
    std::ios::sync_with_stdio();
    FlutterDesktopResyncOutputStreams();
  }
}

std::vector<std::string> GetCommandLineArguments() {
  int argc;
  wchar_t** argv = ::CommandLineToArgvW(::GetCommandLineW(), &argc);
  if (argv == nullptr) {
    return std::vector<std::string>();
  }

  std::vector<std::string> command_line_arguments;
  for (int i = 0; i < argc; i++) {
    int wide_len = static_cast<int>(wcslen(argv[i]));
    int size_needed = ::WideCharToMultiByte(CP_UTF8, 0, argv[i], wide_len, NULL,
                                            0, NULL, NULL);
    std::string arg(size_needed, 0);
    ::WideCharToMultiByte(CP_UTF8, 0, argv[i], wide_len, &arg[0], size_needed,
                          NULL, NULL);
    command_line_arguments.push_back(arg);
  }

  ::LocalFree(argv);

  return command_line_arguments;
}
