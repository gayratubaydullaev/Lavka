import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../../features/onboarding/onboarding_screen.dart';
import '../../features/auth/auth_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/catalog/category_screen.dart';
import '../../features/catalog/product_screen.dart';
import '../../features/search/search_screen.dart';
import '../../features/cart/cart_screen.dart';
import '../../features/checkout/checkout_screen.dart';
import '../../features/orders/orders_screen.dart';
import '../../features/orders/order_tracking_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/profile/loyalty_history_screen.dart';
import '../../features/support/support_chat_screen.dart';
import '../../features/shell/main_shell.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: auth.isOnboarded ? '/' : '/onboarding',
    redirect: (context, state) {
      final isOnboarding = state.matchedLocation == '/onboarding';
      if (!auth.isOnboarded && !isOnboarding) return '/onboarding';
      if (auth.isOnboarded && auth.isAuthenticated && state.matchedLocation == '/auth') {
        return '/';
      }
      return null;
    },
    routes: [
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
      GoRoute(path: '/auth', builder: (_, __) => const AuthScreen()),
      ShellRoute(
        builder: (_, __, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/orders', builder: (_, __) => const OrdersScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
        ],
      ),
      GoRoute(path: '/category/:id', builder: (_, s) => CategoryScreen(categoryId: s.pathParameters['id']!)),
      GoRoute(path: '/product/:id', builder: (_, s) => ProductScreen(productId: s.pathParameters['id']!)),
      GoRoute(path: '/search', builder: (_, __) => const SearchScreen()),
      GoRoute(path: '/cart', builder: (_, __) => const CartScreen()),
      GoRoute(path: '/checkout', builder: (_, __) => const CheckoutScreen()),
      GoRoute(path: '/order/:id/track', builder: (_, s) => OrderTrackingScreen(orderId: s.pathParameters['id']!)),
      GoRoute(path: '/support', builder: (_, __) => const SupportChatScreen()),
      GoRoute(path: '/loyalty/history', builder: (_, __) => const LoyaltyHistoryScreen()),
    ],
  );
});
