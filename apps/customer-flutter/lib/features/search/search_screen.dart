import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_services.dart';
import '../../core/providers/city_provider.dart';
import '../../core/providers/cart_provider.dart';
import '../../widgets/product_card.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});
  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  List<dynamic> _results = [];
  List<String> _suggestions = [];
  bool _loading = false;

  Future<void> _search(String q) async {
    if (q.length < 2) {
      setState(() {
        _suggestions = [];
        _results = [];
      });
      return;
    }
    setState(() => _loading = true);
    try {
      final id = ref.read(cityProvider);
      final api = ref.read(catalogApiProvider);
      final products = await api.search(darkstoreId: id, query: q);
      final suggestions = await api.searchSuggestions(darkstoreId: id, query: q);
      setState(() {
        _results = products;
        _suggestions = suggestions;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Поиск товаров...', border: InputBorder.none),
          onSubmitted: _search,
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
                    _search(_suggestions[i]);
                  },
                ),
              ),
            ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: ProductCard.gridDelegate(context),
                    itemCount: _results.length,
                    itemBuilder: (_, i) => ProductCard(
                      product: _results[i],
                      onAdd: () => ref.read(cartProvider.notifier).add(_results[i]),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
