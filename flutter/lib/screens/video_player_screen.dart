import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:chewie/chewie.dart';
import 'package:video_player/video_player.dart';
import 'package:wakelock/wakelock.dart';
import '../services/anime_api_service.dart';
import '../providers/watch_history_provider.dart';
import '../models/watch_history.dart';

class VideoPlayerScreen extends StatefulWidget {
  final String episodeId;
  final int episodeNumber;
  final String animeTitle;
  final String? animeId;
  final String? animeImage;
  final bool isDub;

  const VideoPlayerScreen({
    super.key,
    required this.episodeId,
    required this.episodeNumber,
    required this.animeTitle,
    this.animeId,
    this.animeImage,
    this.isDub = false,
  });

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  final AnimeApiService _apiService = AnimeApiService();
  VideoPlayerController? _videoPlayerController;
  ChewieController? _chewieController;
  bool _isLoading = true;
  String? _error;
  Duration _lastSavedPosition = Duration.zero;

  @override
  void initState() {
    super.initState();
    Wakelock.enable();
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
      DeviceOrientation.portraitUp,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _loadVideo();
    _setupProgressTracking();
  }

  @override
  void dispose() {
    Wakelock.disable();
    _saveWatchHistory();
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    _videoPlayerController?.removeListener(_onVideoPositionChanged);
    _videoPlayerController?.dispose();
    _chewieController?.dispose();
    super.dispose();
  }

  void _setupProgressTracking() {
    // Save progress every 5 seconds
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted && _videoPlayerController != null) {
        _saveWatchHistory();
        _setupProgressTracking();
      }
    });
  }

  void _onVideoPositionChanged() {
    if (_videoPlayerController != null) {
      final position = _videoPlayerController!.value.position;

      // Save progress every 5 seconds
      if ((position - _lastSavedPosition).inSeconds.abs() >= 5) {
        _lastSavedPosition = position;
        _saveWatchHistory();
      }
    }
  }

  Future<void> _saveWatchHistory() async {
    if (_videoPlayerController == null || widget.animeId == null) return;

    final watchHistoryProvider = Provider.of<WatchHistoryProvider>(context, listen: false);
    final position = _videoPlayerController!.value.position;
    final duration = _videoPlayerController!.value.duration;

    if (duration.inSeconds == 0) return;

    final historyItem = WatchHistoryItem(
      id: widget.animeId!,
      name: widget.animeTitle,
      img: widget.animeImage ?? '',
      episodeId: widget.episodeId,
      episodeNumber: widget.episodeNumber,
      timestamp: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      progress: position.inSeconds,
      duration: duration.inSeconds,
      lastWatched: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      subOrDub: widget.isDub ? 'dub' : 'sub',
    );

    await watchHistoryProvider.addToHistory(historyItem);
  }

  Future<void> _loadVideo() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final streamingData =
          await _apiService.getEpisodeSources(widget.episodeId, widget.isDub);

      if (streamingData == null || streamingData.sources.isEmpty) {
        setState(() {
          _error = 'No video sources available';
          _isLoading = false;
        });
        return;
      }

      final videoUrl = streamingData.sources.first.url;

      _videoPlayerController = VideoPlayerController.networkUrl(
        Uri.parse(videoUrl),
        httpHeaders: streamingData.headers,
      );

      _videoPlayerController!.addListener(_onVideoPositionChanged);

      await _videoPlayerController!.initialize();

      // Try to resume from last position
      final watchHistoryProvider = Provider.of<WatchHistoryProvider>(context, listen: false);
      final historyItem = await watchHistoryProvider.getHistoryForAnime(widget.animeId ?? '');
      
      if (historyItem != null && historyItem.episodeId == widget.episodeId) {
        final resumePosition = Duration(seconds: historyItem.progress);
        if (resumePosition.inSeconds > 10) {
          await _videoPlayerController!.seekTo(resumePosition);
        }
      }

      _chewieController = ChewieController(
        videoPlayerController: _videoPlayerController!,
        autoPlay: true,
        looping: false,
        allowFullScreen: true,
        allowMuting: true,
        showControls: true,
        aspectRatio: _videoPlayerController!.value.aspectRatio,
        placeholder: Container(
          color: Colors.black,
          child: const Center(
            child: CircularProgressIndicator(),
          ),
        ),
        errorBuilder: (context, errorMessage) {
          return Center(
            child: Text(
              errorMessage,
              style: const TextStyle(color: Colors.white),
            ),
          );
        },
      );

      setState(() => _isLoading = false);
    } catch (e) {
      setState(() {
        _error = 'Error loading video: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(),
              )
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _error!,
                          style: const TextStyle(color: Colors.white),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadVideo,
                          child: const Text('Retry'),
                        ),
                        const SizedBox(height: 8),
                        ElevatedButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Go Back'),
                        ),
                      ],
                    ),
                  )
                : Column(
                    children: [
                      Container(
                        color: Colors.black87,
                        padding: const EdgeInsets.all(8),
                        child: Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_back,
                                  color: Colors.white),
                              onPressed: () {
                                _saveWatchHistory();
                                Navigator.pop(context);
                              },
                            ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    widget.animeTitle,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    'Episode ${widget.episodeNumber}',
                                    style: const TextStyle(
                                      color: Colors.grey,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Center(
                          child: _chewieController != null
                              ? Chewie(controller: _chewieController!)
                              : const CircularProgressIndicator(),
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }
}
