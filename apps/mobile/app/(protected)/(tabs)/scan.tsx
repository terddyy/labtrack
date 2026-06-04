import { CameraView, type BarcodeScanningResult, type BarcodeSettings } from "expo-camera";
import { memo } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useScanner } from "@/lib/use-scanner";

const QR_SCANNER_SETTINGS: BarcodeSettings = { barcodeTypes: ["qr"] };

const ScannerCamera = memo(function ScannerCamera({ onScan }: { onScan: (result: BarcodeScanningResult) => void }) {
  return (
    <CameraView
      active
      barcodeScannerSettings={QR_SCANNER_SETTINGS}
      facing="back"
      onBarcodeScanned={onScan}
      style={styles.camera}
    />
  );
});

const ScannerOverlay = memo(function ScannerOverlay({ bottomInset, error, isLocked }: { bottomInset: number; error: string | null; isLocked: boolean }) {
  const caption = isLocked ? "Opening asset..." : error ?? "Only LABTRACK asset QR codes will open asset actions.";

  return (
    <View pointerEvents="none" style={[styles.overlay, { bottom: Math.max(bottomInset + 18, 24) }]}>
      <Card style={styles.overlayCard}>
        <Text style={styles.title}>Align the equipment QR code inside the camera view.</Text>
        <Text style={[styles.caption, error && !isLocked ? styles.errorText : null]}>{caption}</Text>
      </Card>
    </View>
  );
});

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { error, handleScan, isCameraActive, isLocked, permission, requestPermission } = useScanner();

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain;

    return (
      <ScreenScrollView contentContainerStyle={styles.permissionContent}>
        <Card>
          <SectionTitle title="Camera permission required" caption="LABTRACK needs camera access to scan equipment QR labels." />
          <Button onPress={canAskAgain ? requestPermission : () => void Linking.openSettings()}>
            {canAskAgain ? "Grant permission" : "Open settings"}
          </Button>
        </Card>
      </ScreenScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      {isCameraActive ? <ScannerCamera onScan={handleScan} /> : <View style={styles.camera} />}
      <ScannerOverlay bottomInset={insets.bottom} error={error} isLocked={isLocked} />
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1
  },
  caption: {
    color: colors.muted
  },
  errorText: {
    color: colors.danger
  },
  overlay: {
    left: 20,
    position: "absolute",
    right: 20
  },
  overlayCard: {
    backgroundColor: colors.surface
  },
  permissionContent: {
    flexGrow: 1,
    justifyContent: "center"
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800"
  }
});
