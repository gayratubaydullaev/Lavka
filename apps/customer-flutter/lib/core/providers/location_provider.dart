import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

class UserLocation {
  const UserLocation({
    required this.lat,
    required this.lng,
    this.available = true,
  });

  final double lat;
  final double lng;
  final bool available;

  static const defaultTashkent = UserLocation(lat: 41.311, lng: 69.279, available: false);
}

final userLocationProvider = FutureProvider<UserLocation>((ref) async {
  try {
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
      return UserLocation.defaultTashkent;
    }
    final pos = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.medium,
        timeLimit: Duration(seconds: 10),
      ),
    );
    return UserLocation(lat: pos.latitude, lng: pos.longitude);
  } catch (_) {
    return UserLocation.defaultTashkent;
  }
});
