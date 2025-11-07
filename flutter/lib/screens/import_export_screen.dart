import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'dart:convert';
import 'package:xml/xml.dart' as xml;
import '../providers/my_list_provider.dart';
import '../providers/watch_history_provider.dart';
import 'package:provider/provider.dart';

class ImportExportScreen extends StatefulWidget {
  const ImportExportScreen({super.key});

  @override
  State<ImportExportScreen> createState() => _ImportExportScreenState();
}

class _ImportExportScreenState extends State<ImportExportScreen> {
  bool _isExporting = false;
  bool _isImporting = false;

  Future<void> _exportMyList(String format) async {
    setState(() => _isExporting = true);
    try {
      final myList = Provider.of<MyListProvider>(context, listen: false).myList;
      final dir = await getApplicationDocumentsDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      String fileName;
      String content;

      if (format == 'json') {
        fileName = 'my_list_$timestamp.json';
        content = jsonEncode({
          'Watching': myList.map((item) => {
                'name': item.title,
                'mal_id': item.id,
              }).toList(),
        });
      } else if (format == 'xml') {
        fileName = 'my_list_$timestamp.xml';
        final builder = xml.XmlBuilder();
        builder.processing('xml', 'version="1.0" encoding="UTF-8"');
        builder.element('myanimelist', nest: () {
          builder.element('myinfo', nest: () {
            builder.element('user_export_type', nest: 1);
          });
          for (final item in myList) {
            builder.element('anime', nest: () {
              builder.element('series_animedb_id', nest: item.id);
              builder.element('series_title', nest: item.title);
            });
          }
        });
        content = builder.buildDocument().toXmlString(pretty: true);
      } else {
        fileName = 'my_list_$timestamp.txt';
        content = myList.map((item) => '${item.title} | ${item.id}').join('\n');
      }

      final file = File('${dir.path}/$fileName');
      await file.writeAsString(content);

      if (mounted) {
        await Share.shareXFiles([XFile(file.path)]);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Export successful!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e')),
        );
      }
    } finally {
      setState(() => _isExporting = false);
    }
  }

  Future<void> _importMyList() async {
    setState(() => _isImporting = true);
    try {
      // File picker functionality - would need file_picker package
      // For now, show a message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('File picker not yet implemented')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Import failed: $e')),
        );
      }
    } finally {
      setState(() => _isImporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Import/Export'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Export',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _isExporting ? null : () => _exportMyList('json'),
            icon: const Icon(Icons.file_download),
            label: const Text('Export as JSON'),
          ),
          const SizedBox(height: 8),
          ElevatedButton.icon(
            onPressed: _isExporting ? null : () => _exportMyList('xml'),
            icon: const Icon(Icons.file_download),
            label: const Text('Export as XML (MAL format)'),
          ),
          const SizedBox(height: 8),
          ElevatedButton.icon(
            onPressed: _isExporting ? null : () => _exportMyList('txt'),
            icon: const Icon(Icons.file_download),
            label: const Text('Export as TXT'),
          ),
          const SizedBox(height: 32),
          const Text(
            'Import',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _isImporting ? null : _importMyList,
            icon: const Icon(Icons.file_upload),
            label: const Text('Import from File'),
          ),
          if (_isExporting || _isImporting)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    );
  }
}

