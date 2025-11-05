#include "run_loop.h"

#include <windows.h>

#include <algorithm>

RunLoop::RunLoop() {}

RunLoop::~RunLoop() {}

void RunLoop::Run() {
  bool keep_running = true;

  TimePoint next_flutter_event_time = TimePoint::clock::now();
  while (keep_running) {
    std::optional<TimePoint> next_event_time = ProcessFlutterEvents();
    if (next_event_time.has_value()) {
      next_flutter_event_time = next_event_time.value();
    }

    // Break the loop if there are no more Flutter instances.
    if (flutter_instances_.empty()) {
      keep_running = false;
      break;
    }

    TimePoint now = TimePoint::clock::now();
    auto wait_duration = std::max(std::chrono::milliseconds(0),
                                   std::chrono::duration_cast<std::chrono::milliseconds>(
                                       next_flutter_event_time - now));

    ::MsgWaitForMultipleObjects(
        0, nullptr, FALSE, static_cast<DWORD>(wait_duration.count()),
        QS_ALLINPUT);
  }
}

void RunLoop::RegisterFlutterInstance(
    flutter::FlutterEngine* flutter_instance) {
  flutter_instances_.insert(flutter_instance);
}

void RunLoop::UnregisterFlutterInstance(
    flutter::FlutterEngine* flutter_instance) {
  flutter_instances_.erase(flutter_instance);
}

std::optional<RunLoop::TimePoint> RunLoop::ProcessFlutterEvents() {
  std::optional<TimePoint> next_event_time;
  for (auto* flutter_instance : flutter_instances_) {
    std::chrono::nanoseconds wait_duration =
        std::chrono::nanoseconds::max();
    uint64_t next_task_time = flutter_instance->ProcessMessages();
    
    // If there are pending tasks, calculate the wait time.
    if (next_task_time != 0) {
      auto now = std::chrono::duration_cast<std::chrono::nanoseconds>(
          TimePoint::clock::now().time_since_epoch());
      int64_t wait_time = static_cast<int64_t>(next_task_time) - 
                         static_cast<int64_t>(now.count());
      if (wait_time > 0) {
        wait_duration = std::chrono::nanoseconds(wait_time);
      } else {
        wait_duration = std::chrono::nanoseconds(0);
      }
    }

    if (wait_duration != std::chrono::nanoseconds::max()) {
      auto now = std::chrono::duration_cast<std::chrono::nanoseconds>(
          TimePoint::clock::now().time_since_epoch());
      TimePoint event_time = TimePoint(now + wait_duration);
      if (!next_event_time.has_value() || event_time < next_event_time.value()) {
        next_event_time = event_time;
      }
    }
  }
  return next_event_time;
}
