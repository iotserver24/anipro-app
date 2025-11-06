import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// A helper class that keeps track of the last interaction mode (pointer vs remote).
class RemoteFocusController extends ChangeNotifier {
  bool _isRemoteMode = false;
  FocusNode? _lastFocusedNode;

  bool get isRemoteMode => _isRemoteMode;

  void updateLastPointerMode(PointerEvent event) {
    if (_isRemoteMode) {
      _isRemoteMode = false;
      notifyListeners();
    }
  }

  void enableRemoteMode() {
    if (!_isRemoteMode) {
      _isRemoteMode = true;
      notifyListeners();
    }
  }

  void registerFocusedNode(FocusNode node) {
    _lastFocusedNode = node;
  }

  void restoreLastFocus() {
    if (_lastFocusedNode == null) {
      return;
    }
    if (_lastFocusedNode!.canRequestFocus) {
      _lastFocusedNode!.requestFocus();
    }
  }
}

/// A [Shortcuts] configuration for Android TV remotes and desktop keyboards.
final Map<LogicalKeySet, Intent> remoteShortcuts = <LogicalKeySet, Intent>{
  LogicalKeySet(LogicalKeyboardKey.select): const ActivateIntent(),
  LogicalKeySet(LogicalKeyboardKey.enter): const ActivateIntent(),
  LogicalKeySet(LogicalKeyboardKey.gameButtonA): const ActivateIntent(),
  LogicalKeySet(LogicalKeyboardKey.arrowUp): const DirectionalFocusIntent(TraversalDirection.up),
  LogicalKeySet(LogicalKeyboardKey.arrowDown): const DirectionalFocusIntent(TraversalDirection.down),
  LogicalKeySet(LogicalKeyboardKey.arrowLeft): const DirectionalFocusIntent(TraversalDirection.left),
  LogicalKeySet(LogicalKeyboardKey.arrowRight): const DirectionalFocusIntent(TraversalDirection.right),
  LogicalKeySet(LogicalKeyboardKey.escape): const BackIntent(),
  LogicalKeySet(LogicalKeyboardKey.goBack): const BackIntent(),
};

/// Allows widgets to react to the Android TV/Remote back button.
class BackIntent extends Intent {
  const BackIntent();
}

class BackAction extends Action<BackIntent> {
  BackAction(this.onBack);

  final VoidCallback onBack;

  @override
  Object? invoke(BackIntent intent) {
    onBack();
    return null;
  }
}

/// Utility widget that wires up focus + shortcuts for remote scenarios.
class RemoteScaffold extends StatelessWidget {
  const RemoteScaffold({
    required this.focusController,
    required this.onBack,
    required this.child,
    super.key,
  });

  final RemoteFocusController focusController;
  final VoidCallback onBack;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Listener(
      onPointerDown: focusController.updateLastPointerMode,
      child: Actions(
        actions: <Type, Action<Intent>>{
          BackIntent: BackAction(onBack),
        },
        child: Shortcuts(
          shortcuts: remoteShortcuts,
          child: FocusTraversalGroup(
            policy: OrderedTraversalPolicy(),
            child: child,
          ),
        ),
      ),
    );
  }
}

class RemoteFocusable extends StatefulWidget {
  const RemoteFocusable({
    required this.focusController,
    required this.child,
    this.onPressed,
    this.debugLabel,
    super.key,
  });

  final RemoteFocusController focusController;
  final Widget child;
  final VoidCallback? onPressed;
  final String? debugLabel;

  @override
  State<RemoteFocusable> createState() => _RemoteFocusableState();
}

class _RemoteFocusableState extends State<RemoteFocusable> {
  late final FocusNode _focusNode;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode(debugLabel: widget.debugLabel);
    _focusNode.addListener(_onFocusChanged);
  }

  @override
  void dispose() {
    _focusNode.removeListener(_onFocusChanged);
    _focusNode.dispose();
    super.dispose();
  }

  void _onFocusChanged() {
    if (_focusNode.hasFocus) {
      widget.focusController.enableRemoteMode();
      widget.focusController.registerFocusedNode(_focusNode);
    }
    setState(() {
      _isFocused = _focusNode.hasFocus;
    });
  }

  @override
  Widget build(BuildContext context) {
    return FocusableActionDetector(
      focusNode: _focusNode,
      autofocus: false,
      onShowFocusHighlight: (_) {},
      onShowHoverHighlight: (_) {},
      onFocusChange: (_) => _onFocusChanged(),
      actions: <Type, Action<Intent>>{
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            widget.onPressed?.call();
            return null;
          },
        ),
      },
      child: AnimatedScale(
        scale: _isFocused ? 1.05 : 1.0,
        duration: const Duration(milliseconds: 120),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          decoration: BoxDecoration(
            border: _isFocused
                ? Border.all(color: Theme.of(context).colorScheme.secondary, width: 2)
                : null,
            borderRadius: BorderRadius.circular(12),
          ),
          child: widget.child,
        ),
      ),
    );
  }
}
