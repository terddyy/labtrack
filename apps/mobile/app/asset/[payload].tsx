import { parseQrPayload } from "@labtrack/shared";
import { Link, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, TextInput, View } from "react-native";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { mobileAssets } from "@/lib/sample-data";

export default function AssetDetailsScreen() {
  const { payload } = useLocalSearchParams<{ payload?: string }>();
  const rawPayload = decodeURIComponent(payload ?? "");
  const parsed = parseQrPayload(rawPayload);
  const asset = mobileAssets.find((item) => item.activeQrCode === parsed?.code);

  if (!asset) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.page, gap: spacing.gap }}>
        <Card>
          <SectionTitle title="Asset not found" caption="The scanned code may be inactive, regenerated, or outside the LABTRACK asset register." />
          <Link href="/scan" asChild>
            <Button>Scan Again</Button>
          </Link>
        </Card>
      </ScrollView>
    );
  }

  const isAvailable = asset.status === "available";

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.page, gap: spacing.gap }}>
      <Card>
        <View style={{ gap: 10 }}>
          <Badge label={asset.status} tone={isAvailable ? "success" : "warning"} />
          <Text selectable style={{ color: colors.text, fontSize: 26, fontWeight: "900" }}>{asset.name}</Text>
          <Text selectable style={{ color: colors.muted }}>{asset.categoryName} · {asset.locationName}</Text>
        </View>
      </Card>

      <Card>
        <SectionTitle title="Asset details" />
        <Detail label="Property number" value={asset.propertyNumber} />
        <Detail label="Serial number" value={asset.serialNumber ?? "Not recorded"} />
        <Detail label="Condition" value={asset.condition.replaceAll("_", " ")} />
        <Detail label="QR code" value={asset.activeQrCode} />
      </Card>

      <Card>
        <SectionTitle title="Request booking" caption="Submit the intended schedule and purpose. An administrator will approve or reject the request." />
        <TextInput placeholder="Purpose of use" placeholderTextColor={colors.muted} multiline style={inputStyle} />
        <TextInput placeholder="Requested date and time" placeholderTextColor={colors.muted} style={inputStyle} />
        <Button>Submit Booking Request</Button>
      </Card>

      <Card>
        <SectionTitle title="Report defect" caption="Use this when the item is damaged, missing parts, or not working as expected." />
        <TextInput placeholder="Issue title" placeholderTextColor={colors.muted} style={inputStyle} />
        <TextInput placeholder="Describe the defect" placeholderTextColor={colors.muted} multiline style={[inputStyle, { minHeight: 96, textAlignVertical: "top" }]} />
        <Button variant="secondary">Submit Defect Report</Button>
      </Card>
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ borderTopColor: colors.border, borderTopWidth: 1, gap: 4, paddingTop: 12 }}>
      <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>{label}</Text>
      <Text selectable style={{ color: colors.text, fontSize: 16 }}>{value}</Text>
    </View>
  );
}

const inputStyle = {
  backgroundColor: colors.surface,
  borderColor: colors.border,
  borderRadius: 10,
  borderWidth: 1,
  color: colors.text,
  minHeight: 46,
  paddingHorizontal: 12,
  paddingVertical: 10
};
