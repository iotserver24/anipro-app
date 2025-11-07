import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../services/schedule_service.dart';
import '../models/schedule_item.dart';
import 'anime_details_screen.dart';

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({super.key});

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  final ScheduleService _scheduleService = ScheduleService();
  List<ScheduleItem> _schedule = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSchedule();
  }

  Future<void> _loadSchedule() async {
    setState(() => _isLoading = true);
    try {
      final schedule = await _scheduleService.getSchedule();
      setState(() {
        _schedule = schedule;
        _isLoading = false;
      });
    } catch (e) {
      print('Error loading schedule: $e');
      setState(() => _isLoading = false);
    }
  }

  String _formatCountdown(int seconds) {
    if (seconds <= 0) return 'Airing now';
    
    final days = seconds ~/ 86400;
    final hours = (seconds % 86400) ~/ 3600;
    final minutes = (seconds % 3600) ~/ 60;
    
    if (days > 0) {
      return '$days d ${hours}h';
    } else if (hours > 0) {
      return '${hours}h ${minutes}m';
    } else {
      return '${minutes}m';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Schedule'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () async {
              await _scheduleService.triggerScheduleGeneration();
              _loadSchedule();
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _schedule.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.calendar_today,
                        size: 64,
                        color: Colors.grey[600],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No schedule available',
                        style: TextStyle(
                          fontSize: 18,
                          color: Colors.grey[400],
                        ),
                      ),
                      const SizedBox(height: 8),
                      ElevatedButton(
                        onPressed: () async {
                          await _scheduleService.triggerScheduleGeneration();
                          _loadSchedule();
                        },
                        child: const Text('Generate Schedule'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadSchedule,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(8),
                    itemCount: _schedule.length,
                    itemBuilder: (context, index) {
                      final item = _schedule[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: CachedNetworkImage(
                              imageUrl: item.bannerUrl,
                              width: 60,
                              height: 80,
                              fit: BoxFit.cover,
                              placeholder: (context, url) => Container(
                                color: Colors.grey[800],
                                width: 60,
                                height: 80,
                              ),
                              errorWidget: (context, url, error) => Container(
                                color: Colors.grey[800],
                                width: 60,
                                height: 80,
                                child: const Icon(Icons.error),
                              ),
                            ),
                          ),
                          title: Text(
                            item.name,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Episode ${item.episode}'),
                              Text(
                                item.time,
                                style: TextStyle(fontSize: 12, color: Colors.grey[400]),
                              ),
                              const SizedBox(height: 4),
                              Chip(
                                label: Text(
                                  _formatCountdown(item.secondsUntilAiring),
                                  style: const TextStyle(fontSize: 11),
                                ),
                                backgroundColor: const Color(0xFF6C63FF),
                                padding: EdgeInsets.zero,
                              ),
                            ],
                          ),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => AnimeDetailsScreen(
                                  animeId: item.id,
                                ),
                              ),
                            );
                          },
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

