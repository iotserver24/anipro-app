import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';
import 'package:chewie/chewie.dart';
import '../config/app_config.dart';
import '../services/api_service.dart';
import '../models/anime_models.dart';

class VideoPlayerScreen extends StatefulWidget {
  final String episodeId;
  final String episodeTitle;

  const VideoPlayerScreen({
    super.key,
    required this.episodeId,
    required this.episodeTitle,
  });

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  final ApiService _apiService = ApiService();
  VideoPlayerController? _videoPlayerController;
  ChewieController? _chewieController;
  bool _isLoading = true;
  String? _error;
  EpisodeSources? _sources;

  @override
  void initState() {
    super.initState();
    _loadEpisodeSources();
    // Set landscape mode
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    // Hide status bar and navigation bar
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    _videoPlayerController?.dispose();
    _chewieController?.dispose();
    // Restore orientations
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
    // Show status bar and navigation bar
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  Future<void> _loadEpisodeSources() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final sources = await _apiService.getEpisodeSources(widget.episodeId);
      setState(() {
        _sources = sources;
      });
      
      if (sources.sources.isNotEmpty) {
        await _initializePlayer(sources.sources.first.url);
      } else {
        setState(() {
          _error = 'No video sources available';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Failed to load video sources';
        _isLoading = false;
      });
    }
  }

  Future<void> _initializePlayer(String videoUrl) async {
    try {
      _videoPlayerController = VideoPlayerController.networkUrl(
        Uri.parse(videoUrl),
      );

      await _videoPlayerController!.initialize();

      _chewieController = ChewieController(
        videoPlayerController: _videoPlayerController!,
        autoPlay: true,
        looping: false,
        aspectRatio: _videoPlayerController!.value.aspectRatio,
        allowFullScreen: true,
        allowMuting: true,
        showControls: true,
        placeholder: Container(
          color: Colors.black,
          child: const Center(
            child: CircularProgressIndicator(),
          ),
        ),
        errorBuilder: (context, errorMessage) {
          return Center(
            child: Text(
              'Error: $errorMessage',
              style: const TextStyle(color: Colors.white),
            ),
          );
        },
      );

      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Failed to initialize video player';
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
                child: CircularProgressIndicator(
                  color: Color(AppConfig.primaryColor),
                ),
              )
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          size: 64,
                          color: Colors.red,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: _loadEpisodeSources,
                          child: const Text('Retry'),
                        ),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Go Back'),
                        ),
                      ],
                    ),
                  )
                : _chewieController != null
                    ? Column(
                        children: [
                          // Video Player
                          Expanded(
                            child: Center(
                              child: Chewie(
                                controller: _chewieController!,
                              ),
                            ),
                          ),
                          // Episode Info
                          Container(
                            padding: const EdgeInsets.all(16),
                            color: const Color(AppConfig.cardColor),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    widget.episodeTitle,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                if (_sources != null &&
                                    _sources!.sources.length > 1)
                                  PopupMenuButton<String>(
                                    icon: const Icon(Icons.settings),
                                    onSelected: (quality) async {
                                      final selectedSource = _sources!.sources
                                          .firstWhere(
                                        (s) => s.quality == quality,
                                      );
                                      await _videoPlayerController?.dispose();
                                      await _chewieController?.dispose();
                                      await _initializePlayer(
                                          selectedSource.url);
                                    },
                                    itemBuilder: (context) {
                                      return _sources!.sources.map((source) {
                                        return PopupMenuItem<String>(
                                          value: source.quality,
                                          child: Text(source.quality),
                                        );
                                      }).toList();
                                    },
                                  ),
                              ],
                            ),
                          ),
                        ],
                      )
                    : const Center(
                        child: Text(
                          'No video available',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
      ),
    );
  }
}
