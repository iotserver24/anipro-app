import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../screens/main_navigation_screen.dart';

/// TV Remote Navigation Mixin
/// Provides D-pad navigation support for Android TV
mixin TVRemoteNavigation<T extends StatefulWidget> on State<T> {
  final Map<String, FocusNode> focusNodes = {};
  final Map<String, ScrollController> scrollControllers = {};

  @override
  void initState() {
    super.initState();
    initializeFocusNodes();
  }

  void initializeFocusNodes() {
    // Override in subclasses to initialize focus nodes
  }

  @override
  void dispose() {
    focusNodes.values.forEach((node) => node.dispose());
    scrollControllers.values.forEach((controller) => controller.dispose());
    super.dispose();
  }

  /// Handle D-pad navigation
  KeyEventResult handleDPadNavigation(KeyEvent event, String sectionKey) {
    if (event is KeyDownEvent) {
      final controller = scrollControllers[sectionKey];
      if (controller == null) return KeyEventResult.ignored;

      switch (event.logicalKey) {
        case LogicalKeyboardKey.arrowRight:
          controller.animateTo(
            controller.offset + 160,
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
          );
          return KeyEventResult.handled;
        case LogicalKeyboardKey.arrowLeft:
          controller.animateTo(
            controller.offset - 160,
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
          );
          return KeyEventResult.handled;
        default:
          return KeyEventResult.ignored;
      }
    }
    return KeyEventResult.ignored;
  }

  /// Create a focusable widget with TV support
  Widget buildFocusableWidget({
    required Widget child,
    String? focusKey,
    VoidCallback? onSelect,
    bool autofocus = false,
  }) {
    return Focus(
      focusNode: focusKey != null ? focusNodes[focusKey] : null,
      autofocus: autofocus,
      onKeyEvent: (node, event) {
        if (event is KeyDownEvent) {
          if ((event.logicalKey == LogicalKeyboardKey.select ||
                  event.logicalKey == LogicalKeyboardKey.enter) &&
              onSelect != null) {
            onSelect();
            return KeyEventResult.handled;
          }
        }
        return KeyEventResult.ignored;
      },
      child: Builder(
        builder: (context) {
          final hasFocus = Focus.of(context).hasFocus;
          return Container(
            decoration: hasFocus
                ? BoxDecoration(
                    border: Border.all(color: const Color(0xFF6C63FF), width: 3),
                    borderRadius: BorderRadius.circular(8),
                  )
                : null,
            child: child,
          );
        },
      ),
    );
  }
}

