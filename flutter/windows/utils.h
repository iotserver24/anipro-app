#ifndef RUNNER_UTILS_H_
#define RUNNER_UTILS_H_

#include <flutter_windows.h>

#include <vector>
#include <string>

void CreateAndAttachConsole();

std::vector<std::string> GetCommandLineArguments();

#endif  // RUNNER_UTILS_H_
