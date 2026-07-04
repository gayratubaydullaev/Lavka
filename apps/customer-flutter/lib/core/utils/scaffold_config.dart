import 'package:flutter/foundation.dart';

/// On Flutter web, [Scaffold.resizeToAvoidBottomInset] can trigger a negative
/// viewInsets assertion when the virtual keyboard is dismissed (engine bug).
bool get scaffoldResizeToAvoidBottomInset => !kIsWeb;
