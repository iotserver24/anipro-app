import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/gallery_item.dart';
import '../services/gallery_service.dart';

class GalleryScreen extends StatefulWidget {
  const GalleryScreen({super.key});

  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen>
    with SingleTickerProviderStateMixin {
  final GalleryService _galleryService = GalleryService();
  late TabController _tabController;

  List<GalleryItem> _waifuItems = [];
  List<GalleryItem> _husbandoItems = [];
  bool _isLoadingWaifu = true;
  bool _isLoadingHusbando = true;
  int _waifuPage = 1;
  int _husbandoPage = 1;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadWaifu();
    _loadHusbando();
  }

  Future<void> _loadWaifu() async {
    setState(() => _isLoadingWaifu = true);
    try {
      final items = await _galleryService.getGalleryItems(
        type: 'waifu',
        page: _waifuPage,
      );
      setState(() {
        _waifuItems.addAll(items);
        _isLoadingWaifu = false;
      });
    } catch (e) {
      setState(() => _isLoadingWaifu = false);
    }
  }

  Future<void> _loadHusbando() async {
    setState(() => _isLoadingHusbando = true);
    try {
      final items = await _galleryService.getGalleryItems(
        type: 'husbando',
        page: _husbandoPage,
      );
      setState(() {
        _husbandoItems.addAll(items);
        _isLoadingHusbando = false;
      });
    } catch (e) {
      setState(() => _isLoadingHusbando = false);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gallery'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Waifu'),
            Tab(text: 'Husbando'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildGalleryGrid(_waifuItems, _isLoadingWaifu, _loadWaifu),
          _buildGalleryGrid(_husbandoItems, _isLoadingHusbando, _loadHusbando),
        ],
      ),
    );
  }

  Widget _buildGalleryGrid(
    List<GalleryItem> items,
    bool isLoading,
    VoidCallback loadMore,
  ) {
    if (isLoading && items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    return GridView.builder(
      padding: const EdgeInsets.all(8),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 0.75,
      ),
      itemCount: items.length + (isLoading ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == items.length) {
          loadMore();
          return const Center(child: CircularProgressIndicator());
        }

        final item = items[index];
        return GestureDetector(
          onTap: () {
            // Show full screen image viewer
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => _FullScreenImageViewer(item: item),
              ),
            );
          },
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: CachedNetworkImage(
              imageUrl: item.url,
              fit: BoxFit.cover,
              placeholder: (context, url) => Container(
                color: Colors.grey[800],
                child: const Center(child: CircularProgressIndicator()),
              ),
              errorWidget: (context, url, error) => Container(
                color: Colors.grey[800],
                child: const Icon(Icons.error),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _FullScreenImageViewer extends StatelessWidget {
  final GalleryItem item;

  const _FullScreenImageViewer({required this.item});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: CachedNetworkImage(
          imageUrl: item.url,
          fit: BoxFit.contain,
          placeholder: (context, url) => const CircularProgressIndicator(),
          errorWidget: (context, url, error) => const Icon(Icons.error),
        ),
      ),
    );
  }
}

