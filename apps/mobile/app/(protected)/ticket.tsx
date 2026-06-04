import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, EmptyState, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useTicketThreads } from "@/lib/use-ticket-threads";

export default function TicketScreen() {
  const { error, isLoading, refresh, threads } = useTicketThreads();

  return (
    <ScreenScrollView>
      <View style={styles.headerRow}>
        <SectionTitle title="Ticket chat" caption="Conversations stay attached to the related borrowing request or defect report." />
        <Button disabled={isLoading} fullWidth={false} loading={isLoading} onPress={refresh} variant="secondary">
          Refresh
        </Button>
      </View>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {!threads.length && !isLoading ? (
        <EmptyState body="Borrowing and defect conversations will appear after a thread is created." title="No ticket threads yet" />
      ) : null}
      {threads.map((thread) => (
        <Card key={thread.id}>
          <Text style={styles.cardTitle}>{thread.subjectType === "booking" ? "Borrowing request" : "Defect report"}</Text>
          <Text numberOfLines={1} style={styles.metaText}>
            {thread.bookingId ? `Borrowing ref: ${formatReference(thread.bookingId)}` : `Defect ref: ${formatReference(thread.defectReportId ?? "")}`}
          </Text>
          <Text style={styles.metaText}>{new Date(thread.createdAt).toLocaleString()}</Text>
          <Link href={{ pathname: "/ticket/[threadId]", params: { threadId: thread.id } }} asChild>
            <Button>Open thread</Button>
          </Link>
        </Card>
      ))}
    </ScreenScrollView>
  );
}

function formatReference(value: string) {
  return value.slice(0, 8).toUpperCase();
}

const styles = StyleSheet.create({
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23,
    textTransform: "capitalize"
  },
  headerRow: {
    alignItems: "flex-start",
    gap: 12
  },
  metaText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  }
});
