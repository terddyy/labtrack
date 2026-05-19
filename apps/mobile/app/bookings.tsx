import { ScrollView, Text, View } from "react-native";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";
import { mobileAssets, mobileBookings } from "@/lib/sample-data";

export default function BookingsScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.page, gap: spacing.gap }}>
      <SectionTitle title="My bookings" caption="Track requests, approvals, checkout, and return status." />
      {mobileBookings.map((booking) => {
        const asset = mobileAssets.find((item) => item.id === booking.assetId);
        return (
          <Card key={booking.id}>
            <View style={{ gap: 8 }}>
              <Badge label={booking.status} tone="warning" />
              <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>{asset?.name ?? "Unknown asset"}</Text>
              <Text selectable style={{ color: colors.muted }}>{booking.purpose}</Text>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}
