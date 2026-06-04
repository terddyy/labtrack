import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, EmptyState, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useDefectReports } from "@/lib/use-defect-reports";

export default function ReportsScreen() {
  const { error, isLoading, refresh, reports } = useDefectReports();

  return (
    <ScreenScrollView>
      <View style={styles.headerRow}>
        <SectionTitle title="Defect reports" caption="Follow up on equipment issues and administrator triage." />
        <Button disabled={isLoading} fullWidth={false} loading={isLoading} onPress={refresh} variant="secondary">
          Refresh
        </Button>
      </View>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {!reports.length && !isLoading ? (
        <EmptyState body="Submitted equipment issues and resolution notes will appear here." title="No defect reports yet" />
      ) : null}
      {reports.map((report) => (
        <Card key={report.id}>
          <Badge label={report.status} tone={report.status === "resolved" ? "success" : report.status === "rejected" ? "danger" : "warning"} />
          <Text style={styles.cardTitle}>{report.title}</Text>
          <Text numberOfLines={1} style={styles.metaText}>
            Asset ref: {formatReference(report.assetId)}
          </Text>
          <Text style={styles.bodyText}>{report.description}</Text>
          {report.resolutionNotes ? <Notice tone={report.status === "resolved" ? "success" : "neutral"}>{report.resolutionNotes}</Notice> : null}
        </Card>
      ))}
    </ScreenScrollView>
  );
}

function formatReference(value: string) {
  return value.slice(0, 8).toUpperCase();
}

const styles = StyleSheet.create({
  bodyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23
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
