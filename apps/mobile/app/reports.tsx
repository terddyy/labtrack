import { ScrollView, Text, View } from "react-native";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { mobileAssets, mobileReports } from "@/lib/sample-data";

export default function ReportsScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.page, gap: spacing.gap }}>
      <SectionTitle title="Defect reports" caption="Follow up on submitted equipment issues and administrator triage." />
      {mobileReports.map((report) => {
        const asset = mobileAssets.find((item) => item.id === report.assetId);
        return (
          <Card key={report.id}>
            <View style={{ gap: 8 }}>
              <Badge label={report.status} tone="warning" />
              <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>{report.title}</Text>
              <Text selectable style={{ color: colors.muted }}>{asset?.name ?? "Unknown asset"}</Text>
              <Text selectable style={{ color: colors.muted, lineHeight: 20 }}>{report.description}</Text>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}
