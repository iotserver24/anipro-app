import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeSettingsScreen extends StatefulWidget {
  const ThemeSettingsScreen({super.key});

  @override
  State<ThemeSettingsScreen> createState() => _ThemeSettingsScreenState();
}

class _ThemeSettingsScreenState extends State<ThemeSettingsScreen> {
  String? _backgroundMediaType;
  String? _backgroundMediaUrl;
  double _backgroundOpacity = 0.3;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _backgroundMediaType = prefs.getString('theme_background_media_type');
      _backgroundMediaUrl = prefs.getString('theme_background_media_url');
      _backgroundOpacity = prefs.getDouble('theme_background_opacity') ?? 0.3;
    });
  }

  Future<void> _saveSettings() async {
    final prefs = await SharedPreferences.getInstance();
    if (_backgroundMediaType != null) {
      await prefs.setString('theme_background_media_type', _backgroundMediaType!);
    }
    if (_backgroundMediaUrl != null) {
      await prefs.setString('theme_background_media_url', _backgroundMediaUrl!);
    }
    await prefs.setDouble('theme_background_opacity', _backgroundOpacity);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Theme Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Background Media',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          ListTile(
            title: const Text('Image URL'),
            subtitle: Text(_backgroundMediaUrl ?? 'Not set'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () async {
              final url = await _showUrlInputDialog('Image URL');
              if (url != null) {
                setState(() {
                  _backgroundMediaType = 'image';
                  _backgroundMediaUrl = url;
                });
                await _saveSettings();
              }
            },
          ),
          ListTile(
            title: const Text('Video URL'),
            subtitle: Text(_backgroundMediaUrl ?? 'Not set'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () async {
              final url = await _showUrlInputDialog('Video URL');
              if (url != null) {
                setState(() {
                  _backgroundMediaType = 'video';
                  _backgroundMediaUrl = url;
                });
                await _saveSettings();
              }
            },
          ),
          const SizedBox(height: 16),
          Text('Opacity: ${(_backgroundOpacity * 100).toInt()}%'),
          Slider(
            value: _backgroundOpacity,
            onChanged: (value) {
              setState(() {
                _backgroundOpacity = value;
              });
              _saveSettings();
            },
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () {
              setState(() {
                _backgroundMediaType = null;
                _backgroundMediaUrl = null;
                _backgroundOpacity = 0.3;
              });
              _saveSettings();
            },
            child: const Text('Reset to Default'),
          ),
        ],
      ),
    );
  }

  Future<String?> _showUrlInputDialog(String title) async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Enter URL',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

