#!/usr/bin/env bash
# Run customer Flutter app on Android (sets JAVA_HOME from Android Studio snap)
# Prod-local Kong: ./scripts/run-android.sh --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1 --dart-define=WS_BASE_URL=ws://10.0.2.2:8000/api/v1/ws
set -euo pipefail
export JAVA_HOME="${JAVA_HOME:-/snap/android-studio/current/jbr}"
export PATH="$JAVA_HOME/bin:$PATH"
cd "$(dirname "$0")/.."
flutter pub get
flutter run "$@"
