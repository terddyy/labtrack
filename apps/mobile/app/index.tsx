import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { demoQrPayload, mobileBookings, mobileReports } from "@/lib/sample-data";

export default function HomeScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.page, gap: spacing.gap }}>
      <SectionTitle
        title="Instructor workspace"
        caption="Scan equipment QR codes, submit booking requests, report defects, and continue ticket conversations with administrators."
      />

      <Card style={{ backgroundColor: colors.primaryMuted }}>
        <Text selectable style={{ color: colors.text, fontSize: 24, fontWeight: "900" }}>Scan first, act faster</Text>
        <Text selectable style={{ color: colors.muted, lineHeight: 21 }}>
          QR codes open the exact asset record, so booking and defect reports are attached to the correct item.
        </Text>
        <Link href="/scan" asChild>
          <Button>Open QR Scanner</Button>
        </Link>
      </Card>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Link href={{ pathname: "/asset/[payload]", params: { payload: encodeURIComponent(demoQrPayload) } }} asChild>
          <Button variant="secondary">Demo Asset</Button>
        </Link>
        <Link href="/ticket" asChild>
          <Button variant="secondary">Open Ticket</Button>
        </Link>
      </View>

      <Card>
        <SectionTitle title="Active requests" />
        {mobileBookings.map((booking) => (
          <View key={booking.id} style={{ gap: 8 }}>
            <Badge label={booking.status} tone="warning" />
            <Text selectable style={{ color: colors.text, fontWeight: "700" }}>{booking.purpose}</Text>
            <Text selectable style={{ color: colors.muted }}>{new Date(booking.requestedStartAt).toLocaleString()}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle title="Defect follow-up" />
        {mobileReports.map((report) => (
          <View key={report.id} style={{ gap: 8 }}>
            <Badge label={report.status} tone="warning" />
            <Text selectable style={{ color: colors.text, fontWeight: "700" }}>{report.title}</Text>
            <Text selectable style={{ color: colors.muted, lineHeight: 20 }}>{report.description}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
