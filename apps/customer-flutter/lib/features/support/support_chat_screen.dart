import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../../core/config/app_config.dart';
import '../../core/theme/app_theme.dart';

class SupportChatScreen extends StatefulWidget {
  const SupportChatScreen({super.key});
  @override
  State<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends State<SupportChatScreen> {
  final _controller = TextEditingController();
  final _messages = <Map<String, String>>[
    {'from': 'system', 'text': 'Добро пожаловать в поддержку Jomboy Lavka'},
  ];
  WebSocketChannel? _channel;

  @override
  void initState() {
    super.initState();
    try {
      _channel = WebSocketChannel.connect(Uri.parse('${AppConfig.wsBaseUrl}?channel=support'));
      _channel!.stream.listen((data) {
        final msg = jsonDecode(data as String) as Map<String, dynamic>;
        if (msg['type'] == 'chat_message') {
          setState(() => _messages.add({'from': 'operator', 'text': msg['text'] as String}));
        }
      });
    } catch (_) {}
  }

  void _send() {
    if (_controller.text.isEmpty) return;
    setState(() => _messages.add({'from': 'user', 'text': _controller.text}));
    _channel?.sink.add(jsonEncode({'type': 'chat_message', 'text': _controller.text}));
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Поддержка')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (_, i) {
                final m = _messages[i];
                final isUser = m['from'] == 'user';
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: isUser ? AppTheme.primary : AppTheme.surface,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(m['text']!, style: TextStyle(color: isUser ? Colors.white : AppTheme.textPrimary)),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                IconButton(icon: const Icon(Icons.attach_file), onPressed: () {}),
                Expanded(child: TextField(controller: _controller, decoration: const InputDecoration(hintText: 'Сообщение...'))),
                IconButton(icon: const Icon(Icons.send, color: AppTheme.primary), onPressed: _send),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
