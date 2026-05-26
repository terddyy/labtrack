import { bookingRequestSchema, defectReportSchema, parseQrPayload } from "@labtrack/shared";
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RequireActiveProfile } from "@/components/auth-gate";
import { Badge, Button, Card, Field, InlineMeta, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import {
  createBooking,
  createDefectReport,
  formatApiError,
  resolveAssetByPayload,
  type MobileAsset
} from "@/lib/labtrack-api";

export default function AssetDetailsScreen() {
  return (
    <RequireActiveProfile>
      <AssetDetailsContent />
    </RequireActiveProfile>
  );
}

function AssetDetailsContent() {
  const { payload } = useLocalSearchParams<{ payload?: string }>();
  const rawPayload = useMemo(() => safeDecode(payload ?? ""), [payload]);
  const parsed = parseQrPayload(rawPayload);
  const [asset, setAsset] = useState<MobileAsset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingForm, setBookingForm] = useState({ purpose: "", requestedStartAt: "", requestedEndAt: "" });
  const [defectForm, setDefectForm] = useState({ title: "", description: "" });
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [defectMessage, setDefectMessage] = useState<string | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [isSubmittingDefect, setIsSubmittingDefect] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAsset() {
      if (!parsed) {
        setAsset(null);
        setIsLoading(false);
        setError("This QR code is not a valid LABTRACK asset code.");
        return;
      }

      setAsset(null);
      setIsLoading(true);
      setError(null);

      try {
        const nextAsset = await resolveAssetByPayload(rawPayload);

        if (!isMounted) {
          return;
        }

        setAsset(nextAsset);
        setError(nextAsset ? null : "The scanned code is inactive, regenerated, or outside the asset register.");
      } catch (loadError) {
        if (isMounted) {
          setAsset(null);
          setError(formatApiError(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAsset();

    return () => {
      isMounted = false;
    };
  }, [parsed, rawPayload]);

  async function handleBookingSubmit() {
    if (!asset) {
      return;
    }

    const input = {
      assetId: asset.id,
      requestedStartAt: bookingForm.requestedStartAt.trim(),
      requestedEndAt: bookingForm.requestedEndAt.trim(),
      purpose: bookingForm.purpose.trim()
    };
    const validation = bookingRequestSchema.safeParse(input);

    if (!validation.success) {
      setBookingMessage(validation.error.issues[0]?.message ?? "Booking request is invalid.");
      return;
    }

    setIsSubmittingBooking(true);
    setBookingMessage(null);

    try {
      await createBooking(validation.data);
      setBookingForm({ purpose: "", requestedStartAt: "", requestedEndAt: "" });
      setBookingMessage("Booking request submitted.");
    } catch (submitError) {
      setBookingMessage(formatApiError(submitError));
    } finally {
      setIsSubmittingBooking(false);
    }
  }

  async function handleDefectSubmit() {
    if (!asset) {
      return;
    }

    const input = {
      assetId: asset.id,
      title: defectForm.title.trim(),
      description: defectForm.description.trim()
    };
    const validation = defectReportSchema.safeParse(input);

    if (!validation.success) {
      setDefectMessage(validation.error.issues[0]?.message ?? "Defect report is invalid.");
      return;
    }

    setIsSubmittingDefect(true);
    setDefectMessage(null);

    try {
      await createDefectReport(validation.data);
      setDefectForm({ title: "", description: "" });
      setDefectMessage("Defect report submitted.");
    } catch (submitError) {
      setDefectMessage(formatApiError(submitError));
    } finally {
      setIsSubmittingDefect(false);
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

  const isAvailable = asset.status === "available";

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
        <SectionTitle title="Request booking" caption="Submit the schedule and purpose. An administrator will approve or reject the request." />
        {bookingMessage ? <Notice tone={bookingMessage.includes("submitted") ? "success" : "warning"}>{bookingMessage}</Notice> : null}
        <Field
          label="Purpose"
          multiline
          onChangeText={(purpose) => setBookingForm((form) => ({ ...form, purpose }))}
          placeholder="Class, lab activity, or equipment use"
          value={bookingForm.purpose}
        />
        <Field
          autoCapitalize="none"
          label="Start time"
          onChangeText={(requestedStartAt) => setBookingForm((form) => ({ ...form, requestedStartAt }))}
          placeholder="2026-05-22T09:00:00+08:00"
          value={bookingForm.requestedStartAt}
        />
        <Field
          autoCapitalize="none"
          label="End time"
          onChangeText={(requestedEndAt) => setBookingForm((form) => ({ ...form, requestedEndAt }))}
          placeholder="2026-05-22T11:00:00+08:00"
          value={bookingForm.requestedEndAt}
        />
        <Button disabled={isSubmittingBooking} loading={isSubmittingBooking} onPress={handleBookingSubmit}>
          Submit booking request
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
        <Button disabled={isSubmittingDefect} loading={isSubmittingDefect} onPress={handleDefectSubmit} variant="secondary">
          Submit defect report
        </Button>
      </Card>
    </ScreenScrollView>
  );
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const styles = StyleSheet.create({
  assetHero: {
    backgroundColor: colors.primaryMuted,
    borderColor: "#C3DED8"
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
