import { isCustodianRole } from "@labtrack/shared";
import { Link, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BookingSchedulePicker } from "@/components/booking-schedule-picker";
import { Badge, Button, Card, Field, InlineMeta, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors, shadows, spacing } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import { checkoutBorrowing, formatApiError, getBorrowingMonitor, returnBorrowing, type MobileBorrowing } from "@/lib/labtrack-api";
import { useAssetWorkflow } from "@/lib/use-asset-workflow";

export default function AssetDetailsScreen() {
  const auth = useCurrentProfile();
  const { payload } = useLocalSearchParams<{ payload?: string }>();
  const {
    asset,
    bookingMessage,
    bookingPurpose,
    bookingRange,
    bookingValidationNow,
    defectForm,
    defectMessage,
    error,
    isAvailable,
    isBookingRangeValid,
    isLoading,
    isSubmittingBooking,
    isSubmittingDefect,
    setBookingPurpose,
    setBookingRange,
    setDefectForm,
    submitBooking,
    submitDefect
  } = useAssetWorkflow(payload);
  const isCustodian = auth.status === "ready" && isCustodianRole(auth.profile.role);
  const [handoffs, setHandoffs] = useState<MobileBorrowing[]>([]);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [handoffMutationId, setHandoffMutationId] = useState<string | null>(null);

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

  useEffect(() => {
    void loadHandoffs();
  }, [loadHandoffs]);

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

  if (isLoading) {
    return (
      <ScreenScrollView>
        <Card>
          <SectionTitle title="Loading asset" caption="Checking the active QR code against LABTRACK." />
        </Card>
      </ScreenScrollView>
    );
  }

  if (!asset) {
    return (
      <ScreenScrollView>
        <Card>
          <SectionTitle title="Asset not found" caption={error ?? "The scanned code may be inactive, regenerated, or outside the LABTRACK asset register."} />
          <Link href="/scan" asChild>
            <Button>Scan again</Button>
          </Link>
        </Card>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView>
      <Card style={styles.assetHero}>
        <View style={styles.heroTopRow}>
          <View style={styles.assetIcon}>
            <Text style={styles.assetIconText}>LT</Text>
          </View>
          <Badge label={asset.status} tone={isAvailable ? "success" : "warning"} />
        </View>
        <Text style={styles.assetName}>{asset.name}</Text>
        <Text style={styles.assetMeta}>{asset.categoryName} | {asset.locationName}</Text>
        <View style={styles.assetQuickStats}>
          <View style={styles.assetQuickStat}>
            <Text style={styles.assetQuickLabel}>Property</Text>
            <Text numberOfLines={1} style={styles.assetQuickValue}>{asset.propertyNumber}</Text>
          </View>
          <View style={styles.assetQuickStat}>
            <Text style={styles.assetQuickLabel}>Condition</Text>
            <Text numberOfLines={1} style={styles.assetQuickValue}>{asset.condition.replaceAll("_", " ")}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <SectionTitle title="Asset details" />
        <InlineMeta label="Property number" value={asset.propertyNumber} />
        <InlineMeta label="Serial number" value={asset.serialNumber ?? "Not recorded"} />
        <InlineMeta label="Condition" value={asset.condition.replaceAll("_", " ")} />
        <InlineMeta label="QR code" value={asset.activeQrCode} />
      </Card>

      {isCustodian ? (
        <Card style={styles.formCard}>
          <View style={styles.cardHeader}>
            <SectionTitle title="Custodian handoff" caption="Confirm approved borrowing checkout or active return after scanning this QR code." />
            <Button fullWidth={false} onPress={() => void loadHandoffs()} variant="secondary">Refresh</Button>
          </View>
          {handoffError ? <Notice tone="danger">{handoffError}</Notice> : null}
          {!handoffs.length ? <Notice tone="neutral">No approved or checked-out borrowing is waiting for this asset.</Notice> : null}
          {handoffs.map((handoff) => (
            <View key={handoff.id} style={styles.handoffRow}>
              <View style={styles.handoffCopy}>
                <Badge label={handoff.status} tone={handoff.status === "approved" ? "success" : "warning"} />
                <Text style={styles.handoffTitle}>{handoff.borrowerName ?? handoff.borrowerEmail ?? "Borrower"}</Text>
                <Text style={styles.assetMeta}>{handoff.purpose}</Text>
                <Text style={styles.assetMeta}>{new Date(handoff.requestedStartAt).toLocaleString()} - {new Date(handoff.requestedEndAt).toLocaleString()}</Text>
              </View>
              {handoff.status === "approved" ? (
                <Button
                  disabled={Boolean(handoffMutationId)}
                  fullWidth={false}
                  loading={handoffMutationId === handoff.id}
                  onPress={() => void runHandoff(handoff.id, "checkout")}
                >
                  Check out
                </Button>
              ) : null}
              {handoff.status === "checked_out" ? (
                <Button
                  disabled={Boolean(handoffMutationId)}
                  fullWidth={false}
                  loading={handoffMutationId === handoff.id}
                  onPress={() => void runHandoff(handoff.id, "return")}
                  variant="secondary"
                >
                  Return
                </Button>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={styles.formCard}>
        <SectionTitle title="Request borrowing" caption="Submit the schedule and purpose. A custodian will approve or reject the request." />
        {bookingMessage ? <Notice tone={bookingMessage.includes("submitted") ? "success" : "warning"}>{bookingMessage}</Notice> : null}
        <Field
          label="Purpose"
          multiline
          onChangeText={setBookingPurpose}
          placeholder="Class, lab activity, or equipment use"
          value={bookingPurpose}
        />
        <BookingSchedulePicker
          disabled={isSubmittingBooking}
          now={bookingValidationNow}
          onRangeChange={setBookingRange}
          range={bookingRange}
        />
        <Button disabled={isSubmittingBooking || !isAvailable || !isBookingRangeValid} loading={isSubmittingBooking} onPress={submitBooking}>
          Submit borrowing request
        </Button>
      </Card>

      <Card style={styles.formCard}>
        <SectionTitle title="Report defect" caption="Use this when the item is damaged, missing parts, or not working as expected." />
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
        <Button disabled={isSubmittingDefect} loading={isSubmittingDefect} onPress={submitDefect} variant="secondary">
          Submit defect report
        </Button>
      </Card>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  assetHero: {
    backgroundColor: colors.mintSoft,
    borderColor: "rgba(255,255,255,0.84)",
    gap: 14,
    padding: 22
  },
  assetIcon: {
    alignItems: "center",
    backgroundColor: "#2C3A78",
    borderColor: colors.surface,
    borderRadius: 20,
    borderWidth: 3,
    height: 54,
    justifyContent: "center",
    width: 54,
    ...shadows.soft
  },
  assetIconText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900"
  },
  assetMeta: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  assetName: {
    color: colors.text,
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 33
  },
  assetQuickLabel: {
    color: colors.subtle,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  assetQuickStat: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    flex: 1,
    gap: 3,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  assetQuickStats: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 4
  },
  assetQuickValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  cardHeader: {
    alignItems: "flex-start",
    gap: 12
  },
  formCard: {
    gap: 14
  },
  handoffCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  handoffRow: {
    alignItems: "flex-start",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: spacing.controlRadius,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  handoffTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  }
});
