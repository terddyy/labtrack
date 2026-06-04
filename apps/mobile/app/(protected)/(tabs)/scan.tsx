import { CameraView, type BarcodeScanningResult, type BarcodeSettings } from "expo-camera";
import { memo } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors, shadows } from "@/constants/theme";
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

const ScannerOverlay = memo(function ScannerOverlay({
  bottomInset,
  error,
  isLocked,
  topInset
}: {
  bottomInset: number;
  error: string | null;
  isLocked: boolean;
  topInset: number;
}) {
  const caption = isLocked ? "Opening asset..." : error ?? "Only LABTRACK asset QR codes will open asset actions.";

  return (
    <>
      <View pointerEvents="none" style={[styles.scanHeader, { top: Math.max(topInset + 18, 28) }]}>
        <Text style={styles.scanHeaderTitle}>LABTRACK Scan</Text>
        <Text style={styles.scanHeaderCaption}>Camera is ready</Text>
      </View>
      <View pointerEvents="none" style={styles.reticleWrap}>
        <View style={styles.reticle}>
          <View style={[styles.reticleCorner, styles.reticleTopLeft]} />
          <View style={[styles.reticleCorner, styles.reticleTopRight]} />
          <View style={[styles.reticleCorner, styles.reticleBottomLeft]} />
          <View style={[styles.reticleCorner, styles.reticleBottomRight]} />
        </View>
      </View>
      <View pointerEvents="none" style={[styles.overlay, { bottom: Math.max(bottomInset + 104, 118) }]}>
        <Card style={styles.overlayCard}>
          <Text style={styles.title}>Align the equipment QR code inside the soft frame.</Text>
          <Text style={[styles.caption, error && !isLocked ? styles.errorText : null]}>{caption}</Text>
        </Card>
      </View>
    </>
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
      <ScannerOverlay bottomInset={insets.bottom} error={error} isLocked={isLocked} topInset={insets.top} />
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1
  },
  caption: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
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
    backgroundColor: colors.surface,
    borderColor: "rgba(255,255,255,0.82)",
    gap: 8,
    padding: 18
  },
  permissionContent: {
    flexGrow: 1,
    justifyContent: "center"
  },
  screen: {
    backgroundColor: "#111827",
    flex: 1
  },
  reticle: {
    height: 238,
    position: "relative",
    width: 238
  },
  reticleBottomLeft: {
    borderRightWidth: 0,
    borderTopWidth: 0,
    bottom: 0,
    left: 0
  },
  reticleBottomRight: {
    borderLeftWidth: 0,
    borderTopWidth: 0,
    bottom: 0,
    right: 0
  },
  reticleCorner: {
    borderColor: colors.mint,
    borderRadius: 10,
    borderWidth: 5,
    height: 56,
    position: "absolute",
    width: 56
  },
  reticleTopLeft: {
    borderBottomWidth: 0,
    borderRightWidth: 0,
    left: 0,
    top: 0
  },
  reticleTopRight: {
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    right: 0,
    top: 0
  },
  reticleWrap: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  scanHeader: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: 24,
    borderWidth: 1,
    left: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    position: "absolute",
    right: 20,
    ...shadows.floating
  },
  scanHeaderCaption: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  scanHeaderTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23
  }
});
