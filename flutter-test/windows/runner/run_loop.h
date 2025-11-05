#ifndef RUNNER_RUN_LOOP_H_
#define RUNNER_RUN_LOOP_H_

#include <flutter/flutter_engine.h>

#include <chrono>
#include <set>

// A runloop that waits for any Flutter events and dispatches them
// to the Flutter engine.
class RunLoop {
 public:
  RunLoop();
  ~RunLoop();

  // Prevent copying.
  RunLoop(RunLoop const&) = delete;
  RunLoop& operator=(RunLoop const&) = delete;

  // Runs the run loop until the application quits.
  void Run();

  // Registers the given Flutter instance for event servicing.
  void RegisterFlutterInstance(
      flutter::FlutterEngine* flutter_instance);

  // Unregisters the given Flutter instance from event servicing.
  void UnregisterFlutterInstance(
      flutter::FlutterEngine* flutter_instance);

 private:
  using TimePoint = std::chrono::steady_clock::time_point;

  // Processes any currently pending Flutter events.
  //
  // Returns the time at which the next event should be processed, or nullopt
  // if there are no pending events.
  std::optional<TimePoint> ProcessFlutterEvents();

  std::set<flutter::FlutterEngine*> flutter_instances_;
};

#endif  // RUNNER_RUN_LOOP_H_
