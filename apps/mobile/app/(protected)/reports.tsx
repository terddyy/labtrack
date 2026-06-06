import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, EmptyState, Notice, ScreenFlatList, SkeletonCard } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useDefectReports } from "@/lib/use-defect-reports";

export default function ReportsScreen() {
  const { error, hasLoaded, isLoading, refresh, reports } = useDefectReports();

  return (
    <ScreenFlatList
      data={reports}
      empty={hasLoaded && !isLoading ? <EmptyState body="Submitted equipment issues and resolution notes will appear here." title="No defect reports yet" /> : null}
      header={(
        <>
          <Card style={styles.heroCard}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>Incident Desk</Text>
              <Text style={styles.heroTitle}>Clean defect triage for every lab.</Text>
              <Text style={styles.heroCaption}>Severity, asset reference, report time, and resolution state are kept scannable.</Text>
            </View>
            <View style={styles.heroActions}>
              <View style={styles.heroMetric}>
                <Text style={styles.heroMetricValue}>{reports.length}</Text>
                <Text style={styles.heroMetricLabel}>reports</Text>
              </View>
              <Button disabled={isLoading} fullWidth={false} loading={isLoading} onPress={refresh} variant="secondary">
                Refresh
              </Button>
            </View>
          </Card>
          {error ? <Notice tone="danger">{error}</Notice> : null}
          {!hasLoaded && isLoading ? (
            <>
              <SkeletonCard lines={3} />
              <SkeletonCard lines={4} />
            </>
          ) : null}
        </>
      )}
      keyExtractor={(report) => report.id}
      renderItem={({ item: report }) => (
        <Card style={styles.reportCard}>
          <View style={styles.reportTopRow}>
            <View style={styles.reportHeaderMain}>
              <View style={[styles.severityIcon, report.status === "resolved" ? styles.severityResolved : styles.severityOpen]}>
                <Text style={styles.severityText}>{report.status === "resolved" ? "OK" : "!"}</Text>
              </View>
              <View style={styles.reportCopy}>
                <Text style={styles.cardTitle}>{report.title}</Text>
                <Text numberOfLines={2} style={styles.metaText}>
                  Asset {formatReference(report.assetId)} • Reported {formatRelative(report.createdAt)}
                </Text>
              </View>
            </View>
            <Badge label={report.status} tone={report.status === "resolved" ? "success" : report.status === "rejected" ? "danger" : "warning"} />
          </View>
          <Text style={styles.bodyText}>{report.description}</Text>
          {report.resolutionNotes ? <Notice tone={report.status === "resolved" ? "success" : "neutral"}>{report.resolutionNotes}</Notice> : null}
        </Card>
      )}
    />
  );
}

function formatReference(value: string) {
  return value.slice(0, 8).toUpperCase();
}

const styles = StyleSheet.create({
  bodyText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23
  },
  heroCaption: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  heroActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  heroCard: {
    backgroundColor: colors.warningMuted,
    borderColor: "rgba(255,255,255,0.84)",
    gap: 14,
    padding: 18
  },
  heroCopy: {
    gap: 7,
    minWidth: 0
  },
  heroKicker: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  heroMetric: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: "row",
    gap: 7,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  heroMetricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  heroMetricValue: {
    color: colors.warning,
    fontSize: 22,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
    lineHeight: 26
  },
  heroTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 26
  },
  metaText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  reportCard: {
    gap: 14
  },
  reportCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  reportHeaderMain: {
    alignItems: "flex-start",
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 12
  },
  reportTopRow: {
    alignItems: "flex-start",
    flexDirection: "column",
    gap: 12
  },
  severityIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  severityOpen: {
    backgroundColor: colors.danger
  },
  severityResolved: {
    backgroundColor: colors.success
  },
  severityText: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: "900"
  }
});

function formatRelative(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffHours = Math.max(1, Math.round(diffMs / (60 * 60 * 1000)));

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.round(diffHours / 24)}d ago`;
}
