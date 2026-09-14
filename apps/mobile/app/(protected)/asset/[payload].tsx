import { isCustodianRole } from "@labtrack/shared";
import { Link, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { RegistrationMarks } from "@/components/glass";
import { AppIcon, type AppIconName } from "@/components/icons";
import {
  Badge,
  Button,
  Card,
  ConsoleHeader,
  EmptyState,
  Field,
  InlineMeta,
  Notice,
  ScreenScrollView,
  SectionHeader,
  SkeletonCard,
  getInitials,
  type Tone
} from "@/components/ui";
import { WorkflowStepper, type WorkflowStep } from "@/components/workflow-stepper";
import { colors, fonts, spacing, typography } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import {
  checkoutBorrowing,
  checkoutBorrowingByQr,
  formatApiError,
  getBorrowerQrPickup,
  getBorrowingMonitor,
  returnBorrowing,
  type MobileBorrowerQrPickup,
  type MobileBorrowing
} from "@/lib/labtrack-api";
import { useAssetWorkflow } from "@/lib/use-asset-workflow";
import { useOnboardingFlag } from "@/lib/use-onboarding-flags";

type QrTransactionType = "borrow" | "defect" | null;

const ASSET_BORROWER_STEPS: WorkflowStep[] = [
  { id: "review", label: "Review", caption: "Confirm this is the right equipment." },
  { id: "choose", label: "Choose", caption: "Report a defect or borrow for today." },
  { id: "form", label: "Fill form", caption: "Only the form for your chosen action appears." },
  { id: "done", label: "Done", caption: "Wait for approval, then pick up at the custodian office." }
];

function isMeaningfulPickup(pickup: MobileBorrowerQrPickup | null): boolean {
  if (!pickup) {
    return false;
  }

  return pickup.state === "ready"
    || pickup.state === "already_checked_out"
    || pickup.status === "approved"
    || pickup.status === "checked_out";
}

export default function AssetDetailsScreen() {
  const auth = useCurrentProfile();
  const { payload } = useLocalSearchParams<{ payload?: string }>();
  const {
    asset,
    bookingMessage,
    bookingPurpose,
    defectForm,
    defectMessage,
    error,
    isAvailable,
    isLoading,
    isSubmittingBooking,
    isSubmittingDefect,
    setBookingPurpose,
    setDefectForm,
    submitDefect,
    submitSameDayBorrowing
  } = useAssetWorkflow(payload);
  const isCustodian = auth.status === "ready" && isCustodianRole(auth.profile.role);
  const isBorrower = auth.status === "ready" && !isCustodian;
  const scanOnboarding = useOnboardingFlag("scan");
  const [handoffs, setHandoffs] = useState<MobileBorrowing[]>([]);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [handoffMutationId, setHandoffMutationId] = useState<string | null>(null);
  const [pickup, setPickup] = useState<MobileBorrowerQrPickup | null>(null);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [isLoadingPickup, setIsLoadingPickup] = useState(false);
  const [isConfirmingPickup, setIsConfirmingPickup] = useState(false);
  const [didAssetImageFail, setDidAssetImageFail] = useState(false);
  const [selectedQrTransaction, setSelectedQrTransaction] = useState<QrTransactionType>(null);

  const borrowerStep = useMemo(() => {
    if (bookingMessage?.includes("submitted") || defectMessage?.includes("submitted")) {
      return 3;
    }

    if (selectedQrTransaction) {
      return 2;
    }

    return 1;
  }, [bookingMessage, defectMessage, selectedQrTransaction]);

  const showPickupCard = isBorrower && isMeaningfulPickup(pickup);

  const loadHandoffs = useCallback(async () => {
    if (!asset || !isCustodian) {
      setHandoffs([]);
      return;
    }

    const now = new Date();
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    try {
      setHandoffError(null);
      setHandoffs(await getBorrowingMonitor({
        from: from.toISOString(),
        resourceId: asset.id,
        statuses: ["approved", "checked_out"],
        to: to.toISOString()
      }));
    } catch (error) {
      setHandoffError(formatApiError(error));
    }
  }, [asset, isCustodian]);

  const loadPickup = useCallback(async () => {
    if (!asset || !isBorrower) {
      setPickup(null);
      return;
    }

    setIsLoadingPickup(true);

    try {
      setPickupError(null);
      setPickup(await getBorrowerQrPickup(asset.activeQrCode));
    } catch (error) {
      setPickup(null);
      setPickupError(formatApiError(error));
    } finally {
      setIsLoadingPickup(false);
    }
  }, [asset, isBorrower]);

  useEffect(() => {
    void loadHandoffs();
  }, [loadHandoffs]);

  useEffect(() => {
    void loadPickup();
  }, [loadPickup]);

  useEffect(() => {
    setDidAssetImageFail(false);
  }, [asset?.primaryImageUrl]);

  useEffect(() => {
    setSelectedQrTransaction(null);
  }, [asset?.id]);

  async function runHandoff(id: string, action: "checkout" | "return") {
    setHandoffMutationId(id);
    setHandoffError(null);

    try {
      if (action === "checkout") {
        await checkoutBorrowing(id, "Checked out from Android custodian scan.");
      } else {
        await returnBorrowing(id, "Returned from Android custodian scan.");
      }

      await loadHandoffs();
    } catch (error) {
      setHandoffError(formatApiError(error));
    } finally {
      setHandoffMutationId(null);
    }
  }

  async function confirmPickup() {
    if (!asset || pickup?.state !== "ready" || !pickup.borrowingId) {
      return;
    }

    setIsConfirmingPickup(true);
    setPickupError(null);

    try {
      await checkoutBorrowingByQr(asset.activeQrCode, pickup.borrowingId, "Borrower confirmed QR pickup.");
      await loadPickup();
    } catch (error) {
      setPickupError(formatApiError(error));
    } finally {
      setIsConfirmingPickup(false);
    }
  }

  if (isLoading) {
    return (
      <ScreenScrollView header={<ConsoleHeader caption="Checking the active QR code against LABTRACK." eyebrow="Asset · Lookup" inset={false} title="Loading asset…" />} includeHeaderInset>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </ScreenScrollView>
    );
  }

  if (!asset) {
    return (
      <ScreenScrollView header={<ConsoleHeader eyebrow="Asset · Lookup failed" inset={false} title="Asset not found" />} includeHeaderInset>
        <EmptyState
          action={(
            <Link href="/scan" asChild>
              <Button fullWidth={false} icon="scan">Scan again</Button>
            </Link>
          )}
          body={error ?? "The scanned code may be inactive, regenerated, or outside the LABTRACK asset register."}
          icon="scan"
          title="We couldn't match this code"
        />
      </ScreenScrollView>
    );
  }

  const condition = asset.condition.replaceAll("_", " ");

  return (
    <ScreenScrollView
      header={(
        <ConsoleHeader
          caption={`${asset.categoryName} · ${asset.locationName}`}
          eyebrow={`Asset · ${asset.propertyNumber}`}
          inset={false}
          right={(
            <View style={styles.assetThumb}>
              {asset.primaryImageUrl && !didAssetImageFail ? (
                <Image
                  accessibilityIgnoresInvertColors
                  accessibilityLabel={`${asset.name} image`}
                  onError={() => setDidAssetImageFail(true)}
                  resizeMode="cover"
                  source={{ uri: asset.primaryImageUrl }}
                  style={styles.assetImage}
                />
              ) : (
                <Text style={styles.assetInitials}>{getInitials(asset.name)}</Text>
              )}
              <RegistrationMarks color={colors.mint} inset={-5} size={12} thickness={2} />
            </View>
          )}
          title={asset.name}
        >
          <View style={styles.heroChips}>
            <HeroChip dotColor={isAvailable ? colors.mint : "#F5B84C"} label={asset.status.replaceAll("_", " ")} />
            <HeroChip label={condition} />
          </View>
        </ConsoleHeader>
      )}
      includeHeaderInset
    >
      {isBorrower ? (
        <WorkflowStepper
          currentStep={borrowerStep}
          onDismiss={scanOnboarding.isReady && !scanOnboarding.hasSeen ? () => void scanOnboarding.markSeen() : undefined}
          steps={ASSET_BORROWER_STEPS}
          title="Scan workflow"
        />
      ) : null}

      {showPickupCard ? (
        <Card style={styles.formCard} tint="green">
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardEyebrow}>QR PICKUP</Text>
            <RefreshLink loading={isLoadingPickup} onPress={() => void loadPickup()} />
          </View>
          {pickupError ? <Notice tone="danger">{pickupError}</Notice> : null}
          {pickup ? (
            <>
              <View style={styles.pickupBody}>
                <Badge label={pickup.state.replaceAll("_", " ")} tone={pickupTone(pickup.state)} />
                <Text style={styles.cardTitle}>{pickup.message}</Text>
                {pickup.purpose ? <Text style={styles.cardBody}>{pickup.purpose}</Text> : null}
                {pickup.status ? <Text style={styles.monoMeta}>STATUS · {pickup.status.replaceAll("_", " ").toUpperCase()}</Text> : null}
                {pickup.requestedStartAt && pickup.requestedEndAt ? (
                  <Text style={styles.monoMeta}>{formatDateTime(pickup.requestedStartAt)} → {formatDateTime(pickup.requestedEndAt)}</Text>
                ) : null}
              </View>
              {pickup.state === "ready" && pickup.borrowingId ? (
                <Button disabled={isConfirmingPickup} icon="check" loading={isConfirmingPickup} onPress={() => void confirmPickup()}>
                  Confirm pickup
                </Button>
              ) : null}
            </>
          ) : null}
        </Card>
      ) : null}

      {isBorrower && !selectedQrTransaction ? (
        <>
          <SectionHeader title="Choose transaction" />
          <Text style={styles.chooseCaption}>Select what you want to do with this scanned item. Only one form will appear.</Text>
          <View style={styles.choiceRow}>
            <ChoiceTile
              caption={isAvailable ? "Same-day, 90 minutes" : "Not available right now"}
              disabled={!isAvailable}
              icon="borrow"
              label="Borrow item"
              onPress={() => setSelectedQrTransaction("borrow")}
              primary
            />
            <ChoiceTile
              caption="Damaged or not working"
              icon="wrench"
              label="Report defect"
              onPress={() => setSelectedQrTransaction("defect")}
            />
          </View>
        </>
      ) : null}

      {isBorrower && selectedQrTransaction === "borrow" ? (
        <Card style={styles.formCard} tint="blue">
          <FormHeader eyebrow="SAME-DAY BORROW" onChange={() => setSelectedQrTransaction(null)} title="Borrow this item" />
          <Text style={styles.cardBody}>Same-day borrow · 90 minutes from now. A custodian will approve or reject the request.</Text>
          {bookingMessage ? <Notice tone={bookingMessage.includes("submitted") ? "success" : "warning"}>{bookingMessage}</Notice> : null}
          <Field
            label="Purpose"
            multiline
            onChangeText={setBookingPurpose}
            placeholder="Class, lab activity, or equipment use"
            value={bookingPurpose}
          />
          <Button disabled={isSubmittingBooking || !isAvailable} icon="send" loading={isSubmittingBooking} onPress={() => void submitSameDayBorrowing()}>
            Submit borrowing request
          </Button>
        </Card>
      ) : null}

      {isBorrower && selectedQrTransaction === "defect" ? (
        <Card style={styles.formCard} tint="orange">
          <FormHeader eyebrow="DEFECT REPORT" onChange={() => setSelectedQrTransaction(null)} title="Report a defect" />
          <Text style={styles.cardBody}>Use this when the item is damaged, missing parts, or not working as expected.</Text>
          {defectMessage ? <Notice tone={defectMessage.includes("submitted") ? "success" : "warning"}>{defectMessage}</Notice> : null}
          <Field
            label="Issue title"
            onChangeText={(title) => setDefectForm((form) => ({ ...form, title }))}
            placeholder="Short issue summary"
            value={defectForm.title}
          />
          <Field
            label="Description"
            multiline
            onChangeText={(description) => setDefectForm((form) => ({ ...form, description }))}
            placeholder="Describe the defect, missing part, or failure"
            value={defectForm.description}
          />
          <Button disabled={isSubmittingDefect} icon="send" loading={isSubmittingDefect} onPress={submitDefect}>
            Submit defect report
          </Button>
        </Card>
      ) : null}

      {isCustodian ? (
        <>
          <View style={styles.sectionRow}>
            <SectionHeader count={handoffs.length} title="Custodian handoff" />
            <RefreshLink onPress={() => void loadHandoffs()} />
          </View>
          <Text style={styles.chooseCaption}>Confirm approved borrowing checkout or active return after scanning this QR code.</Text>
          {handoffError ? <Notice tone="danger">{handoffError}</Notice> : null}
          {!handoffs.length ? <Notice tone="neutral">No approved or checked-out borrowing is waiting for this asset.</Notice> : null}
          {handoffs.map((handoff) => (
            <Card key={handoff.id} style={styles.handoffCard}>
              <View style={styles.cardHeaderRow}>
                <Text numberOfLines={1} style={styles.cardTitle}>{handoff.borrowerName ?? handoff.borrowerEmail ?? "Borrower"}</Text>
                <Badge label={handoff.status} tone={handoff.status === "approved" ? "success" : "warning"} />
              </View>
              <Text style={styles.cardBody}>{handoff.purpose}</Text>
              <Text style={styles.monoMeta}>{formatDateTime(handoff.requestedStartAt)} → {formatDateTime(handoff.requestedEndAt)}</Text>
              {handoff.status === "approved" ? (
                <Button
                  disabled={Boolean(handoffMutationId)}
                  icon="check"
                  loading={handoffMutationId === handoff.id}
                  onPress={() => void runHandoff(handoff.id, "checkout")}
                >
                  Check out
                </Button>
              ) : null}
              {handoff.status === "checked_out" ? (
                <Button
                  disabled={Boolean(handoffMutationId)}
                  icon="refresh"
                  loading={handoffMutationId === handoff.id}
                  onPress={() => void runHandoff(handoff.id, "return")}
                  variant="secondary"
                >
                  Mark returned
                </Button>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}

      <SectionHeader title="Specifications" />
      <Card style={styles.specCard}>
        <InlineMeta label="Property number" mono value={asset.propertyNumber} />
        <InlineMeta label="Serial number" mono value={asset.serialNumber ?? "Not recorded"} />
        <InlineMeta label="Condition" value={condition} />
        <InlineMeta label="Location" value={asset.locationName} />
        <InlineMeta label="QR code" mono value={asset.activeQrCode} />
      </Card>

      <Link href="/scan" asChild>
        <Button icon="scan" variant="secondary">Scan another asset</Button>
      </Link>
    </ScreenScrollView>
  );
}

function HeroChip({ dotColor, label }: { dotColor?: string; label: string }) {
  return (
    <View style={styles.heroChip}>
      {dotColor ? <View style={[styles.heroChipDot, { backgroundColor: dotColor }]} /> : null}
      <Text style={styles.heroChipText}>{label}</Text>
    </View>
  );
}

function ChoiceTile({
  caption,
  disabled = false,
  icon,
  label,
  onPress,
  primary = false
}: {
  caption: string;
  disabled?: boolean;
  icon: AppIconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.choice, primary ? styles.choicePrimary : null, disabled ? styles.choiceDisabled : pressed ? styles.pressed : null]}
    >
      <View style={[styles.choiceIcon, primary ? styles.choiceIconPrimary : null]}>
        <AppIcon color={primary ? "#FFFFFF" : colors.warning} name={icon} size={20} />
      </View>
      <View style={styles.choiceCopy}>
        <Text style={[styles.choiceLabel, primary ? styles.choiceLabelPrimary : null]}>{label}</Text>
        <Text style={[styles.choiceCaption, primary ? styles.choiceCaptionPrimary : null]}>{caption}</Text>
      </View>
    </Pressable>
  );
}

function FormHeader({ eyebrow, onChange, title }: { eyebrow: string; onChange: () => void; title: string }) {
  return (
    <View style={styles.cardHeaderRow}>
      <View style={styles.formHeaderCopy}>
        <Text style={styles.cardEyebrow}>{eyebrow}</Text>
        <Text style={styles.formTitle}>{title}</Text>
      </View>
      <Pressable accessibilityRole="button" hitSlop={10} onPress={onChange} style={({ pressed }) => [styles.changeLink, pressed ? styles.pressed : null]}>
        <Text style={styles.changeLinkText}>Change transaction</Text>
      </Pressable>
    </View>
  );
}

function RefreshLink({ loading = false, onPress }: { loading?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={loading} hitSlop={10} onPress={onPress} style={({ pressed }) => [styles.changeLink, pressed || loading ? styles.pressed : null]}>
      <AppIcon color={colors.primary} name="refresh" size={14} />
      <Text style={styles.changeLinkText}>{loading ? "Refreshing" : "Refresh"}</Text>
    </Pressable>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, { day: "numeric", hour: "numeric", minute: "2-digit", month: "short" });
}

function pickupTone(state: MobileBorrowerQrPickup["state"]): Tone {
  if (state === "ready" || state === "already_checked_out") {
    return "success";
  }

  if (state === "reserved_by_other" || state === "unavailable") {
    return "danger";
  }

  return "warning";
}

const styles = StyleSheet.create({
  assetImage: {
    borderRadius: 14,
    height: 64,
    width: 64
  },
  assetInitials: {
    color: colors.inkText,
    fontSize: 20,
    fontWeight: "600"
  },
  assetThumb: {
    alignItems: "center",
    backgroundColor: colors.inkRaised,
    borderRadius: 14,
    height: 64,
    justifyContent: "center",
    margin: 5,
    width: 64
  },
  cardBody: {
    color: colors.muted,
    ...typography.body
  },
  cardEyebrow: {
    color: colors.muted,
    ...typography.eyebrow
  },
  cardHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  cardTitle: {
    color: colors.text,
    flexShrink: 1,
    ...typography.headline
  },
  changeLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  changeLinkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600"
  },
  choice: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    borderWidth: 1,
    flex: 1,
    gap: 22,
    minWidth: 0,
    padding: 14
  },
  choiceCaption: {
    color: colors.muted,
    fontSize: 12.5,
    lineHeight: 17
  },
  choiceCaptionPrimary: {
    color: "rgba(255,255,255,0.75)"
  },
  choiceCopy: {
    gap: 2
  },
  choiceDisabled: {
    opacity: 0.45
  },
  choiceIcon: {
    alignItems: "center",
    backgroundColor: colors.warningMuted,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  choiceIconPrimary: {
    backgroundColor: "rgba(255,255,255,0.16)"
  },
  choiceLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600"
  },
  choiceLabelPrimary: {
    color: "#FFFFFF"
  },
  choicePrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  choiceRow: {
    flexDirection: "row",
    gap: 10
  },
  chooseCaption: {
    color: colors.muted,
    marginTop: -6,
    paddingHorizontal: 2,
    ...typography.caption
  },
  formCard: {
    gap: 14
  },
  formHeaderCopy: {
    flex: 1,
    gap: 3
  },
  formTitle: {
    color: colors.text,
    ...typography.title
  },
  handoffCard: {
    gap: 10
  },
  heroChip: {
    alignItems: "center",
    backgroundColor: colors.inkRaised,
    borderColor: colors.inkBorder,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6
  },
  heroChipDot: {
    borderRadius: 3,
    height: 6,
    width: 6
  },
  heroChipText: {
    color: colors.inkText,
    fontSize: 12.5,
    fontWeight: "500",
    textTransform: "capitalize"
  },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  monoMeta: {
    color: colors.subtle,
    fontFamily: fonts.mono,
    fontSize: 11
  },
  pickupBody: {
    gap: 6
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }]
  },
  sectionRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  specCard: {
    gap: 0,
    paddingBottom: 12,
    paddingTop: 1
  }
});
