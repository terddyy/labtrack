import { CameraView, type BarcodeScanningResult, type BarcodeSettings } from "expo-camera";
import { memo, useEffect, useRef } from "react";
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FrostLayer } from "@/components/glass";
import { AppIcon } from "@/components/icons";
import { Button, Card, ConsoleHeader, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors, fonts, typography } from "@/constants/theme";
import { useOnboardingFlag } from "@/lib/use-onboarding-flags";
import { useScanner } from "@/lib/use-scanner";

const QR_SCANNER_SETTINGS: BarcodeSettings = { barcodeTypes: ["qr"] };
const RETICLE_SIZE = 244;
const SCAN_MASK_COLOR = "rgba(10, 12, 18, 0.62)";

const COACH_STEPS = [
  "Align the QR inside the frame",
  "Choose Report defect or Borrow item",
  "Fill only that form",
  "Wait for approval",
  "Scan again at the office to confirm pickup"
];

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

function ScanLine({ active }: { active: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      progress.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { duration: 1800, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(progress, { duration: 1800, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [18, RETICLE_SIZE - 20] });

  return <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />;
}

const ScannerOverlay = memo(function ScannerOverlay({
  bottomInset,
  error,
  isLocked,
  onDismissCoach,
  showCoach,
  topInset
}: {
  bottomInset: number;
  error: string | null;
  isLocked: boolean;
  onDismissCoach?: () => void;
  showCoach: boolean;
  topInset: number;
}) {
  const hasError = Boolean(error) && !isLocked;
  const statusLabel = isLocked ? "OPENING ASSET" : hasError ? "CODE REJECTED" : "READY";
  const statusColor = isLocked ? colors.inkAccent : hasError ? "#FF8A7A" : colors.mint;

  return (
    <>
      <View pointerEvents="none" style={styles.scanMask}>
        <View style={styles.scanMaskBand} />
        <View style={styles.scanMaskMiddle}>
          <View style={styles.scanMaskSide} />
          <View style={styles.scanMaskHole} />
          <View style={styles.scanMaskSide} />
        </View>
        <View style={styles.scanMaskBand} />
      </View>

      <View pointerEvents="none" style={[styles.topBar, { top: Math.max(topInset + 12, 24) }]}>
        <View style={styles.chip}>
          <FrostLayer style={StyleSheet.absoluteFill} />
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.chipText}>SCANNER · {statusLabel}</Text>
        </View>
      </View>

      {showCoach ? (
        <View style={[styles.coachWrap, { top: Math.max(topInset + 64, 76) }]}>
          <View style={styles.smokedCard}>
            <FrostLayer style={StyleSheet.absoluteFill} />
            <Text style={styles.coachEyebrow}>HOW SCANNING WORKS</Text>
            {COACH_STEPS.map((step, index) => (
              <View key={step} style={styles.coachRow}>
                <Text style={styles.coachIndex}>{String(index + 1).padStart(2, "0")}</Text>
                <Text style={styles.coachBody}>{step}</Text>
              </View>
            ))}
            {onDismissCoach ? (
              <Pressable accessibilityRole="button" hitSlop={8} onPress={onDismissCoach} style={styles.coachDismiss}>
                <Text style={styles.coachDismissText}>Got it</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <View pointerEvents="none" style={styles.reticleWrap}>
        <View style={styles.reticle}>
          <View style={[styles.reticleCorner, styles.reticleTopLeft, hasError ? styles.reticleError : null]} />
          <View style={[styles.reticleCorner, styles.reticleTopRight, hasError ? styles.reticleError : null]} />
          <View style={[styles.reticleCorner, styles.reticleBottomLeft, hasError ? styles.reticleError : null]} />
          <View style={[styles.reticleCorner, styles.reticleBottomRight, hasError ? styles.reticleError : null]} />
          <ScanLine active={!isLocked && !hasError} />
        </View>
      </View>

      <View pointerEvents="none" style={[styles.bottomWrap, { bottom: Math.max(bottomInset + 108, 122) }]}>
        <View style={styles.smokedCard}>
          <FrostLayer style={StyleSheet.absoluteFill} />
          <View style={styles.instructionRow}>
            <View style={styles.instructionIcon}>
              <AppIcon color={colors.inkText} name={hasError ? "alert" : "scan"} size={18} />
            </View>
            <View style={styles.instructionCopy}>
              <Text style={styles.instructionTitle}>
                {isLocked ? "Hang tight…" : hasError ? "That code didn't work" : "Point at an equipment label"}
              </Text>
              <Text style={[styles.instructionCaption, hasError ? styles.errorText : null]}>
                {isLocked ? "LABTRACK is opening the asset." : error ?? "Only LABTRACK asset QR codes open asset actions."}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
});

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { error, handleScan, isCameraActive, isLocked, permission, requestPermission } = useScanner();
  const scanOnboarding = useOnboardingFlag("scan");
  const showCoach = scanOnboarding.isReady && !scanOnboarding.hasSeen;

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain;

    return (
      <ScreenScrollView header={<ConsoleHeader caption="Point your camera at a LABTRACK equipment label." eyebrow="Scanner · Offline" title="Scan" />}>
        <Card style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            <AppIcon color={colors.primary} name="camera" size={26} />
          </View>
          <SectionTitle
            caption="LABTRACK needs camera access to scan equipment QR labels. Nothing is recorded or stored."
            title="Camera permission required"
          />
          <Button icon={canAskAgain ? "camera" : "settings"} onPress={canAskAgain ? requestPermission : () => void Linking.openSettings()}>
            {canAskAgain ? "Grant permission" : "Open settings"}
          </Button>
        </Card>
      </ScreenScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      {isCameraActive ? <ScannerCamera onScan={handleScan} /> : <View style={styles.camera} />}
      <ScannerOverlay
        bottomInset={insets.bottom}
        error={error}
        isLocked={isLocked}
        onDismissCoach={showCoach ? () => void scanOnboarding.markSeen() : undefined}
        showCoach={showCoach}
        topInset={insets.top}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomWrap: {
    left: 16,
    position: "absolute",
    right: 16
  },
  camera: {
    flex: 1
  },
  chip: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  chipText: {
    color: colors.inkText,
    ...typography.eyebrow
  },
  coachBody: {
    color: colors.inkText,
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19
  },
  coachDismiss: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 999,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 7
  },
  coachDismissText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600"
  },
  coachEyebrow: {
    color: colors.inkMuted,
    marginBottom: 2,
    ...typography.eyebrow
  },
  coachIndex: {
    color: colors.inkAccent,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 19
  },
  coachRow: {
    flexDirection: "row",
    gap: 10
  },
  coachWrap: {
    left: 16,
    position: "absolute",
    right: 16,
    zIndex: 2
  },
  errorText: {
    color: "#FF8A7A"
  },
  instructionCaption: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 18
  },
  instructionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  instructionIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  instructionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  instructionTitle: {
    color: colors.inkText,
    fontSize: 15.5,
    fontWeight: "600"
  },
  permissionCard: {
    alignItems: "flex-start",
    gap: 16,
    padding: 20
  },
  permissionIcon: {
    alignItems: "center",
    backgroundColor: colors.primaryMuted,
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  reticle: {
    height: RETICLE_SIZE,
    overflow: "hidden",
    position: "relative",
    width: RETICLE_SIZE
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
    borderRadius: 4,
    borderWidth: 3,
    height: 44,
    position: "absolute",
    width: 44
  },
  reticleError: {
    borderColor: "#FF8A7A"
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
  scanLine: {
    backgroundColor: colors.mint,
    boxShadow: "0 0 12px rgba(99, 230, 190, 0.9)",
    height: 2,
    left: 16,
    opacity: 0.85,
    position: "absolute",
    right: 16,
    top: 0
  },
  scanMask: {
    ...StyleSheet.absoluteFill
  },
  scanMaskBand: {
    backgroundColor: SCAN_MASK_COLOR,
    flex: 1
  },
  scanMaskHole: {
    backgroundColor: "transparent",
    height: RETICLE_SIZE,
    width: RETICLE_SIZE
  },
  scanMaskMiddle: {
    flexDirection: "row"
  },
  scanMaskSide: {
    backgroundColor: SCAN_MASK_COLOR,
    flex: 1
  },
  screen: {
    backgroundColor: colors.ink,
    flex: 1
  },
  smokedCard: {
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    overflow: "hidden",
    padding: 14
  },
  statusDot: {
    borderRadius: 3.5,
    height: 7,
    width: 7
  },
  topBar: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0
  }
});
