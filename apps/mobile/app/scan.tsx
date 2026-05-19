import { parseQrPayload } from "@labtrack/shared";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, SectionTitle } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: spacing.page }}>
        <Card>
          <SectionTitle title="Camera permission required" caption="LABTRACK needs camera access to scan equipment QR labels." />
          <Button onPress={requestPermission}>Grant Permission</Button>
        </Card>
      </View>
    );
  }

  function handleScan(result: BarcodeScanningResult) {
    if (isLocked) {
      return;
    }

    const payload = parseQrPayload(result.data);

    if (!payload) {
      setError("This QR code is not a valid LABTRACK asset code.");
      return;
    }

    setIsLocked(true);
    router.replace({ pathname: "/asset/[payload]", params: { payload: encodeURIComponent(result.data) } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        facing="back"
        onBarcodeScanned={handleScan}
        style={{ flex: 1 }}
      />
      <View style={{ bottom: 24, left: 20, position: "absolute", right: 20 }}>
        <Card style={{ backgroundColor: colors.surface }}>
          <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>Align the equipment QR code inside the camera view.</Text>
          <Text selectable style={{ color: error ? colors.danger : colors.muted }}>{error ?? "Only LABTRACK asset QR codes will open asset actions."}</Text>
        </Card>
      </View>
    </View>
  );
}
