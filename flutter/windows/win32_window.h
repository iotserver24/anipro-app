#ifndef RUNNER_WIN32_WINDOW_H_
#define RUNNER_WIN32_WINDOW_H_

#include <windows.h>

#include <functional>
#include <memory>
#include <string>

class Win32Window {
 public:
  struct Point {
    unsigned int x;
    unsigned int y;
  };

  struct Size {
    unsigned int width;
    unsigned int height;
  };

  Win32Window();
  virtual ~Win32Window();

  bool CreateAndShow(const std::wstring& title,
                     const Point& origin,
                     const Size& size);

  HWND GetHandle() const;

  void SetQuitOnClose(bool quit_on_close);

 protected:
  virtual bool OnCreate();

  virtual void OnDestroy();

  virtual LRESULT MessageHandler(HWND window,
                                 UINT const message,
                                 WPARAM const wparam,
                                 LPARAM const lparam) noexcept;

  RECT GetClientArea() {
    RECT frame;
    GetClientRect(window_handle_, &frame);
    return frame;
  }

  void SetChildContent(HWND content);

 private:
  friend class FlutterWindow;

  static LRESULT CALLBACK WndProc(HWND const window,
                                  UINT const message,
                                  WPARAM const wparam,
                                  LPARAM const lparam) noexcept;

  static Win32Window* GetThisFromHandle(HWND const window) noexcept;

  void Destroy();

  static void EnableFullDpiSupportIfAvailable(HWND hwnd);

  HWND window_handle_ = nullptr;

  HWND child_content_ = nullptr;

  bool destroy_on_close_ = true;
};

#endif  // RUNNER_WIN32_WINDOW_H_
