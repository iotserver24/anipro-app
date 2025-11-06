#include "win32_window.h"

#include <flutter_windows.h>
#include <windowsx.h>

#include "resource.h"

namespace {

constexpr const wchar_t kWindowClassName[] = L"ANISURGE2_FLUTTER_WINDOW";

using EnableNonClientDpiScaling = BOOL __stdcall(HWND hwnd);

typedef struct _DwmBlurbehind {
  DWORD dwFlags;
  BOOL fEnable;
  HRGN hRgnBlur;
  BOOL fTransitionOnMaximized;
} DWM_BLURBEHIND, *PDWM_BLURBEHIND;

}  // namespace

Win32Window::Win32Window() {}

Win32Window::~Win32Window() {}

bool Win32Window::CreateAndShow(const std::wstring& title,
                                const Point& origin,
                                const Size& size) {
  Destroy();

  WNDCLASS window_class{};
  window_class.lpfnWndProc = Win32Window::WndProc;
  window_class.hInstance = GetModuleHandle(nullptr);
  window_class.lpszClassName = kWindowClassName;
  RegisterClass(&window_class);

  DWORD window_style = WS_OVERLAPPEDWINDOW;

  RECT frame = {static_cast<LONG>(origin.x), static_cast<LONG>(origin.y),
                static_cast<LONG>(origin.x + size.width),
                static_cast<LONG>(origin.y + size.height)};
  AdjustWindowRect(&frame, window_style, FALSE);

  destroy_on_close_ = true;

  window_handle_ = CreateWindow(
      kWindowClassName, title.c_str(), window_style, frame.left, frame.top,
      frame.right - frame.left, frame.bottom - frame.top, nullptr, nullptr,
      GetModuleHandle(nullptr), this);

  return window_handle_ != nullptr;
}

LRESULT CALLBACK Win32Window::WndProc(HWND const window,
                                      UINT const message,
                                      WPARAM const wparam,
                                      LPARAM const lparam) noexcept {
  if (message == WM_NCCREATE) {
    auto window_struct = reinterpret_cast<CREATESTRUCT*>(lparam);
    SetWindowLongPtr(window, GWLP_USERDATA,
                     reinterpret_cast<LONG_PTR>(window_struct->lpCreateParams));

    auto that = static_cast<Win32Window*>(window_struct->lpCreateParams);
    EnableFullDpiSupportIfAvailable(window);
    that->window_handle_ = window;
  } else if (Win32Window* that = GetThisFromHandle(window)) {
    return that->MessageHandler(window, message, wparam, lparam);
  }

  return DefWindowProc(window, message, wparam, lparam);
}

Win32Window* Win32Window::GetThisFromHandle(HWND const window) noexcept {
  return reinterpret_cast<Win32Window*>(
      GetWindowLongPtr(window, GWLP_USERDATA));
}

void Win32Window::Destroy() {
  if (window_handle_) {
    DestroyWindow(window_handle_);
    window_handle_ = nullptr;
  }
}

LRESULT Win32Window::MessageHandler(HWND hwnd,
                                    UINT const message,
                                    WPARAM const wparam,
                                    LPARAM const lparam) noexcept {
  switch (message) {
    case WM_DESTROY:
      window_handle_ = nullptr;
      if (destroy_on_close_) {
        PostQuitMessage(0);
      }
      return 0;
    case WM_DPICHANGED: {
      auto new_rect = reinterpret_cast<RECT*>(lparam);
      SetWindowPos(hwnd, nullptr, new_rect->left, new_rect->top,
                   new_rect->right - new_rect->left,
                   new_rect->bottom - new_rect->top, SWP_NOZORDER | SWP_NOACTIVATE);
      return 0;
    }
  }

  return DefWindowProc(hwnd, message, wparam, lparam);
}

void Win32Window::SetChildContent(HWND content) {
  child_content_ = content;
  SetParent(content, window_handle_);
  RECT frame;
  GetClientRect(window_handle_, &frame);
  MoveWindow(content, frame.left, frame.top, frame.right - frame.left,
             frame.bottom - frame.top, true);
  ShowWindow(window_handle_, SW_SHOW);
  UpdateWindow(window_handle_);
}

HWND Win32Window::GetHandle() const {
  return window_handle_;
}

void Win32Window::SetQuitOnClose(bool quit_on_close) {
  destroy_on_close_ = quit_on_close;
}

void Win32Window::EnableFullDpiSupportIfAvailable(HWND hwnd) {
  HMODULE user32_module = LoadLibraryA("User32.dll");
  if (!user32_module) {
    return;
  }
  auto enable_non_client_dpi_scaling =
      reinterpret_cast<EnableNonClientDpiScaling*>(
          GetProcAddress(user32_module, "EnableNonClientDpiScaling"));
  if (enable_non_client_dpi_scaling != nullptr) {
    enable_non_client_dpi_scaling(hwnd);
  }
  FreeLibrary(user32_module);
}
