import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { BookingSchedulePicker } from "@/components/booking-schedule-picker";
import { Badge, Button, Card, Field, InlineMeta, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useAssetWorkflow } from "@/lib/use-asset-workflow";

export default function AssetDetailsScreen() {
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
        <Badge label={asset.status} tone={isAvailable ? "success" : "warning"} />
        <Text style={styles.assetName}>{asset.name}</Text>
        <Text style={styles.assetMeta}>
          {asset.categoryName} | {asset.locationName}
        </Text>
      </Card>

      <Card>
        <SectionTitle title="Asset details" />
        <InlineMeta label="Property number" value={asset.propertyNumber} />
        <InlineMeta label="Serial number" value={asset.serialNumber ?? "Not recorded"} />
        <InlineMeta label="Condition" value={asset.condition.replaceAll("_", " ")} />
        <InlineMeta label="QR code" value={asset.activeQrCode} />
      </Card>

      <Card style={styles.formCard}>
        <SectionTitle title="Request borrow" caption="Submit the schedule and purpose. An administrator will approve or reject the request." />
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
          Submit borrow request
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
    backgroundColor: colors.primaryMuted,
    borderColor: colors.secondaryMuted
  },
  assetMeta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  assetName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 29
  },
  formCard: {
    gap: 14
  }
});
