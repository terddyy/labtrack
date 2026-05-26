import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RequireActiveProfile } from "@/components/auth-gate";
import { Badge, Button, Card, EmptyState, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import { formatApiError, listMyDefectReports, type MobileDefectReport } from "@/lib/labtrack-api";

export default function ReportsScreen() {
  return (
    <RequireActiveProfile>
      <ReportsContent />
    </RequireActiveProfile>
  );
}

function ReportsContent() {
  const [reports, setReports] = useState<MobileDefectReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setReports(await listMyDefectReports());
    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadReports();
    }, [loadReports])
  );

  return (
    <ScreenScrollView>
      <View style={styles.headerRow}>
        <SectionTitle title="Defect reports" caption="Follow up on equipment issues and administrator triage." />
        <Button disabled={isLoading} fullWidth={false} loading={isLoading} onPress={loadReports} variant="secondary">
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
