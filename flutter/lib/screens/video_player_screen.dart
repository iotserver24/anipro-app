import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';

import '../models/anime_result.dart';
import '../models/episode.dart';
import '../models/streaming_source.dart';
import '../services/anime_api_service.dart';
import '../services/watch_history_service.dart';

class VideoPlayerScreen extends StatefulWidget {
  final Episode episode;
  final AnimeResult anime;

  const VideoPlayerScreen({
    super.key,
    required this.episode,
    required this.anime,
  });

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  final AnimeApiService _apiService = AnimeApiService();
  final FocusNode _keyboardFocusNode = FocusNode();
  VideoPlayerController? _controller;
  bool _isLoading = true;
  bool _hasError = false;
  String? _errorMessage;
  bool _controlsVisible = true;
  bool _isDub = false;
  Timer? _hideTimer;

  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _keyboardFocusNode.requestFocus();
      }
    });
    WatchHistoryService.instance.addToHistory(widget.anime, widget.episode);
    _loadVideo();
  }

  @override
  void dispose() {
    _hideTimer?.cancel();
    _controller?.dispose();
    _keyboardFocusNode.dispose();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setPreferredOrientations(<DeviceOrientation>[
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    super.dispose();
  }

  Future<void> _loadVideo() async {
    setState(() {
      _isLoading = true;
      _hasError = false;
      _errorMessage = null;
    });

    await _controller?.pause();
    await _controller?.dispose();

    try {
      final streamingResponse =
          await _apiService.getEpisodeSources(widget.episode.id, _isDub);

      if (streamingResponse == null || streamingResponse.sources.isEmpty) {
        setState(() {
          _hasError = true;
          _errorMessage = 'No video sources were returned for this episode.';
          _isLoading = false;
        });
        return;
      }

      final source = _selectBestSource(streamingResponse.sources);
      if (source == null || source.url.isEmpty) {
        setState(() {
          _hasError = true;
          _errorMessage = 'No playable video source found.';
          _isLoading = false;
        });
        return;
      }

      final controller = VideoPlayerController.networkUrl(
        Uri.parse(source.url),
        httpHeaders: streamingResponse.headers,
      );

      await controller.initialize();
      controller.setLooping(false);
      await controller.play();

      if (!mounted) {
        await controller.dispose();
        return;
      }

      setState(() {
        _controller = controller;
        _isLoading = false;
        _controlsVisible = true;
      });

      _scheduleHideControls();
    } catch (error) {
      setState(() {
        _hasError = true;
        _errorMessage = 'Failed to load video: $error';
        _isLoading = false;
      });
    }
  }

  StreamingSource? _selectBestSource(List<StreamingSource> sources) {
    if (sources.isEmpty) return null;
    final m3u8 = sources.where((s) => s.isM3u8).toList();
    if (m3u8.isNotEmpty) {
      return m3u8.first;
    }
    return sources.first;
  }

  void _scheduleHideControls() {
    _hideTimer?.cancel();
    if (_controller?.value.isPlaying ?? false) {
      _hideTimer = Timer(const Duration(seconds: 5), () {
        if (mounted) {
          setState(() {
            _controlsVisible = false;
          });
        }
      });
    }
  }

  void _toggleControls() {
    setState(() {
      _controlsVisible = !_controlsVisible;
    });
    if (_controlsVisible) {
      _scheduleHideControls();
    } else {
      _hideTimer?.cancel();
    }
  }

  void _togglePlayPause() {
    final controller = _controller;
    if (controller == null) return;

    setState(() {
      if (controller.value.isPlaying) {
        controller.pause();
      } else {
        controller.play();
      }
      _controlsVisible = true;
    });

    _scheduleHideControls();
  }

  void _seekRelative(Duration offset) {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return;
    }
    final current = controller.value.position;
    var target = current + offset;
    final duration = controller.value.duration;
    
    if (target < Duration.zero) {
      target = Duration.zero;
    } else if (target > duration) {
      target = duration;
    }
    
    controller.seekTo(target);
    setState(() => _controlsVisible = true);
    _scheduleHideControls();
  }

  Future<void> _toggleAudioTrack() async {
    _isDub = !_isDub;
    await _loadVideo();
  }

  void _toggleFullscreen() {
    final orientation = MediaQuery.of(context).orientation;
    if (orientation == Orientation.landscape) {
      SystemChrome.setPreferredOrientations(<DeviceOrientation>[
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
      ]);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    } else {
      SystemChrome.setPreferredOrientations(<DeviceOrientation>[
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    }
    setState(() => _controlsVisible = true);
    _scheduleHideControls();
  }

  void _handleKey(KeyEvent event) {
    if (event is! KeyDownEvent) {
      return;
    }
    final key = event.logicalKey;

    if (key == LogicalKeyboardKey.select ||
        key == LogicalKeyboardKey.enter ||
        key == LogicalKeyboardKey.space ||
        key == LogicalKeyboardKey.mediaPlayPause ||
        key == LogicalKeyboardKey.mediaPlay ||
        key == LogicalKeyboardKey.mediaPause ||
        key == LogicalKeyboardKey.gameButtonA) {
      _togglePlayPause();
      return;
    }

    if (key == LogicalKeyboardKey.arrowLeft) {
      _seekRelative(const Duration(seconds: -10));
      return;
    }

    if (key == LogicalKeyboardKey.arrowRight) {
      _seekRelative(const Duration(seconds: 10));
      return;
    }

    if (key == LogicalKeyboardKey.arrowUp || key == LogicalKeyboardKey.arrowDown) {
      setState(() => _controlsVisible = true);
      _scheduleHideControls();
    }
  }

  @override
  Widget build(BuildContext context) {
    return KeyboardListener(
      focusNode: _keyboardFocusNode,
      onKeyEvent: _handleKey,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Stack(
            children: <Widget>[
              Center(child: _buildPlayer()),
              if (_controlsVisible && !_isLoading && !_hasError)
                _buildControls(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlayer() {
    if (_isLoading) {
      return const CircularProgressIndicator();
    }

    if (_hasError) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            _errorMessage ?? 'An unknown error occurred.',
            style: const TextStyle(color: Colors.white),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _loadVideo,
            child: const Text('Retry'),
          ),
        ],
      );
    }

    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) {
      return const SizedBox.shrink();
    }

    return GestureDetector(
      onTap: _toggleControls,
      child: AspectRatio(
        aspectRatio: controller.value.aspectRatio,
        child: VideoPlayer(controller),
      ),
    );
  }

  Widget _buildControls() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: <Color>[
            Colors.black.withOpacity(0.7),
            Colors.transparent,
            Colors.transparent,
            Colors.black.withOpacity(0.7),
          ],
          stops: const <double>[0, 0.3, 0.7, 1],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          _buildTopBar(),
          _buildBottomBar(),
        ],
      ),
    );
  }

  Widget _buildTopBar() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Row(
          children: <Widget>[
            IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    widget.anime.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    'Episode ${widget.episode.number}: ${widget.episode.title}',
                    style: const TextStyle(color: Colors.white70, fontSize: 14),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            if (widget.episode.isDubbed && widget.episode.isSubbed)
              IconButton(
                icon: Icon(
                  _isDub ? Icons.mic : Icons.closed_caption,
                  color: Colors.white,
                ),
                tooltip: _isDub ? 'Switch to subbed playback' : 'Switch to dubbed playback',
                onPressed: _toggleAudioTrack,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar() {
    final controller = _controller;
    if (controller == null) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          VideoProgressIndicator(
            controller,
            allowScrubbing: true,
            colors: const VideoProgressColors(
              playedColor: Colors.red,
              bufferedColor: Colors.white38,
              backgroundColor: Colors.white12,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Text(
                _formatDuration(controller.value.position),
                style: const TextStyle(color: Colors.white),
              ),
              Row(
                children: <Widget>[
                  IconButton(
                    icon: Icon(
                      controller.value.isPlaying ? Icons.pause : Icons.play_arrow,
                      color: Colors.white,
                      size: 32,
                    ),
                    onPressed: _togglePlayPause,
                  ),
                  IconButton(
                    icon: const Icon(Icons.fast_rewind, color: Colors.white),
                    onPressed: () => _seekRelative(const Duration(seconds: -10)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.fast_forward, color: Colors.white),
                    onPressed: () => _seekRelative(const Duration(seconds: 10)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.fullscreen, color: Colors.white),
                    onPressed: _toggleFullscreen,
                  ),
                ],
              ),
              Text(
                _formatDuration(controller.value.duration),
                style: const TextStyle(color: Colors.white),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    if (duration.inHours > 0) {
      final hours = duration.inHours.toString().padLeft(2, '0');
      return '$hours:$minutes:$seconds';
    }
    return '$minutes:$seconds';
  }
}
