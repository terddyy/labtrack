import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, EmptyState, Notice, ScreenScrollView } from "@/components/ui";
import { colors, shadows } from "@/constants/theme";
import { useTicketThreads } from "@/lib/use-ticket-threads";

export default function TicketScreen() {
  const { error, isLoading, refresh, threads } = useTicketThreads();

  return (
    <ScreenScrollView>
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>Messages</Text>
            <Text style={styles.heroTitle}>Threaded lab support.</Text>
            <Text style={styles.heroCaption}>Borrowing and defect conversations stay attached to their original workflow.</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricValue}>{threads.length}</Text>
            <Text style={styles.heroMetricLabel}>threads</Text>
          </View>
        </View>
        <Button disabled={isLoading} fullWidth={false} loading={isLoading} onPress={refresh} variant="secondary">
          Refresh
        </Button>
      </Card>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {!threads.length && !isLoading ? (
        <EmptyState body="Borrowing and defect conversations will appear after a thread is created." title="No ticket threads yet" />
      ) : null}
      {threads.map((thread) => (
        <Card key={thread.id} style={styles.threadCard}>
          <View style={styles.threadTopRow}>
            <View style={styles.threadGlyph}>
              <Text style={styles.threadGlyphText}>{thread.subjectType === "booking" ? "B" : "D"}</Text>
            </View>
            <View style={styles.threadCopy}>
              <Text style={styles.cardTitle}>{thread.subjectType === "booking" ? "Borrowing request" : "Defect report"}</Text>
              <Text numberOfLines={1} style={styles.metaText}>
                {thread.bookingId ? `Borrowing ref: ${formatReference(thread.bookingId)}` : `Defect ref: ${formatReference(thread.defectReportId ?? "")}`}
              </Text>
              <Text style={styles.metaText}>{new Date(thread.createdAt).toLocaleString()}</Text>
            </View>
          </View>
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
    fontWeight: "900",
    lineHeight: 23,
    textTransform: "capitalize"
  },
  heroCaption: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  heroCard: {
    backgroundColor: colors.purpleMuted,
    borderColor: "rgba(255,255,255,0.84)",
    gap: 16,
    padding: 22
  },
  heroCopy: {
    flex: 1,
    gap: 7,
    minWidth: 0
  },
  heroKicker: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  heroMetric: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 22,
    height: 82,
    justifyContent: "center",
    width: 82,
    ...shadows.soft
  },
  heroMetricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800"
  },
  heroMetricValue: {
    color: colors.purple,
    fontSize: 28,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    lineHeight: 32
  },
  heroRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between"
  },
  heroTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 30
  },
  metaText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  threadCard: {
    gap: 14
  },
  threadCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  threadGlyph: {
    alignItems: "center",
    backgroundColor: colors.purpleMuted,
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  threadGlyphText: {
    color: colors.purple,
    fontSize: 18,
    fontWeight: "900"
  },
  threadTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  }
});
