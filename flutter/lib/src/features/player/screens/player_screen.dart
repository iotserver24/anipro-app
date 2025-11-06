import 'package:chewie/chewie.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../../models/streaming_response.dart';
import '../../../state/anime_repository.dart';

class PlayerScreen extends StatefulWidget {
  const PlayerScreen({required this.episodeId, super.key});

  final String episodeId;

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  final AnimeRepository _repository = AnimeRepository();
  VideoPlayerController? _controller;
  ChewieController? _chewieController;
  bool _isLoading = true;
  bool _isError = false;

  @override
  void initState() {
    super.initState();
    _loadSources();
  }

  Future<void> _loadSources() async {
    setState(() {
      _isLoading = true;
      _isError = false;
    });
    final StreamingResponse? response =
        await _repository.loadEpisodeSources(widget.episodeId);

    if (response == null || response.sources.isEmpty) {
      setState(() {
        _isLoading = false;
        _isError = true;
      });
      return;
    }

    final primarySource = response.sources.first;
    final controller = VideoPlayerController.networkUrl(Uri.parse(primarySource.url));

    await controller.initialize();

    final chewie = ChewieController(
      videoPlayerController: controller,
      autoPlay: true,
      allowFullScreen: true,
      allowedScreenSleep: false,
      allowMuting: true,
      allowPlaybackSpeedChanging: true,
      additionalOptions: (_, __) {
        final subtitles = response.subtitles;
        if (subtitles.isEmpty) {
          return const [];
        }
        return subtitles
            .map(
              (subtitle) => OptionItem(
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Subtitle: ${subtitle.kind}')),
                  );
                },
                iconData: Icons.subtitles,
                title: subtitle.kind,
              ),
            )
            .toList();
      },
    );

    setState(() {
      _controller = controller;
      _chewieController = chewie;
      _isLoading = false;
    });
  }

  @override
  void dispose() {
    _chewieController?.dispose();
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Player'),
        actions: [
          if (!_isLoading && !_isError)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _loadSources,
            ),
        ],
      ),
      body: Center(
        child: _isLoading
            ? const CircularProgressIndicator()
            : _isError
                ? Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.error_outline, size: 48),
                      const SizedBox(height: 16),
                      const Text('Unable to load video source.'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadSources,
                        child: const Text('Retry'),
                      ),
                    ],
                  )
                : AspectRatio(
                    aspectRatio: _controller!.value.aspectRatio,
                    child: Chewie(
                      controller: _chewieController!,
                    ),
                  ),
      ),
    );
  }
}
