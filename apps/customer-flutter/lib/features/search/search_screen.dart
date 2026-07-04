import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../core/api/api_services.dart';
import '../../core/l10n/app_localizations.dart';
import '../../core/models/models.dart';
import '../../core/providers/cart_provider.dart';
import '../../core/providers/city_provider.dart';
import '../../core/providers/locale_provider.dart';
import '../../core/utils/locale_utils.dart';
import '../../widgets/api_error_view.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/product_card.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});
  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  List<Product> _results = [];
  List<String> _suggestions = [];
  List<String> _recent = [];
  bool _loading = false;
  Object? _error;
  Timer? _debounce;
  int _searchSeq = 0;
  String _latestQuery = '';

  Box get _settings => Hive.box('settings');

  @override
  void initState() {
    super.initState();
    _loadRecent();
  }

  void _loadRecent() {
    final raw = _settings.get('recent_searches');
    if (raw is List) {
      _recent = raw.cast<String>().take(8).toList();
    }
  }

  Future<void> _saveRecent(String q) async {
    final trimmed = q.trim();
    if (trimmed.length < 2) return;
    _recent = [trimmed, ..._recent.where((r) => r != trimmed)].take(8).toList();
    await _settings.put('recent_searches', _recent);
  }

  Future<void> _search(String q) async {
    _debounce?.cancel();
    if (q.length < 2) {
      setState(() {
        _suggestions = [];
        _results = [];
        _error = null;
      });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 350), () => _runSearch(q));
  }

  Future<void> _runSearch(String q) async {
    final query = q.trim();
    _latestQuery = query;
    final seq = ++_searchSeq;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final id = ref.read(cityProvider);
      final api = ref.read(catalogApiProvider);
      final products = await api.search(darkstoreId: id, query: query);
      final suggestions = await api.searchSuggestions(darkstoreId: id, query: query);
      if (!mounted || seq != _searchSeq || _latestQuery != query) return;
      setState(() {
        _results = products;
        _suggestions = suggestions;
      });
      await _saveRecent(query);
    } catch (e) {
      if (mounted && seq == _searchSeq) setState(() => _error = e);
    } finally {
      if (mounted && seq == _searchSeq) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final lang = ref.watch(localeProvider).productLangKey;

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          autofocus: true,
          decoration: InputDecoration(hintText: l10n.searchPlaceholder, border: InputBorder.none),
          onSubmitted: _runSearch,
          onChanged: _search,
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_suggestions.isNotEmpty)
            SizedBox(
              height: 44,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                itemCount: _suggestions.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) => ActionChip(
                  label: Text(_suggestions[i]),
                  onPressed: () {
                    _controller.text = _suggestions[i];
                    _runSearch(_suggestions[i]);
                  },
                ),
              ),
            ),
          if (_controller.text.length < 2 && _recent.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text(l10n.searchRecent, style: Theme.of(context).textTheme.titleSmall),
            ),
          if (_controller.text.length < 2 && _recent.isNotEmpty)
            SizedBox(
              height: 44,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                itemCount: _recent.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) => ActionChip(
                  avatar: const Icon(Icons.history, size: 16),
                  label: Text(_recent[i]),
                  onPressed: () {
                    _controller.text = _recent[i];
                    _runSearch(_recent[i]);
                  },
                ),
              ),
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? ApiErrorView(error: _error!)
                    : _results.isEmpty && _controller.text.length >= 2
                        ? EmptyState(icon: Icons.search_off, title: l10n.searchNothing)
                        : GridView.builder(
                            padding: const EdgeInsets.all(16),
                            gridDelegate: ProductCard.gridDelegate(context),
                            itemCount: _results.length,
                            itemBuilder: (_, i) => ProductCard(
                              product: _results[i],
                              lang: lang,
                              outOfStockLabel: l10n.outOfStock,
                              halalLabel: l10n.halal,
                              onAdd: () {
                                final added = ref.read(cartProvider.notifier).add(
                                      _results[i],
                                      darkstoreId: ref.read(cityProvider),
                                    );
                                if (!mounted) return;
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(added ? l10n.addedToCart : l10n.outOfStock),
                                    duration: const Duration(seconds: 1),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
