import { Alert, Linking } from 'react-native';

// Friendly message + shortcut to the Settings app when a permission is denied.
export function showPermissionDenied(what) {
  Alert.alert(
    `${what} permission needed`,
    `Please allow access to the ${what.toLowerCase()} in Settings to use this feature.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
}