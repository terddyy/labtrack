import { formatStatusLabel, getDefectStatusTone, isOpenDefectStatus } from "@labtrack/shared";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Badge,
  Card,
  ConsoleHeader,
  EmptyState,
  HeaderIconButton,
  IconTile,
  Notice,
  ReadoutStrip,
  ScreenFlatList,
  SegmentedControl,
  SkeletonCard,
  formatReference,
  formatRelativeTime,
  type Tone
} from "@/components/ui";
import { colors, fonts, typography } from "@/constants/theme";
import { useDefectReports } from "@/lib/use-defect-reports";
import type { MobileDefectReport } from "@/lib/labtrack-api";

type ReportFilter = "all" | "open" | "closed";

const reportFilters: Array<{ label: string; value: ReportFilter }> = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" }
];

export default function ReportsScreen() {
  const { error, hasLoaded, isLoading, refresh, reports } = useDefectReports();
  const [filter, setFilter] = useState<ReportFilter>("all");
  const openCount = useMemo(() => reports.filter((report) => isOpenDefectStatus(report.status)).length, [reports]);
  const resolvedCount = useMemo(() => reports.filter((report) => report.status === "resolved").length, [reports]);
  const visibleReports = useMemo(
    () =>
      reports.filter((report) => {
        if (filter === "open") {
          return isOpenDefectStatus(report.status);
        }

        if (filter === "closed") {
          return !isOpenDefectStatus(report.status);
        }

        return true;
      }),
    [filter, reports]
  );

  return (
    <ScreenFlatList
      data={visibleReports}
      empty={
        hasLoaded && !isLoading ? (
          <EmptyState
            body={
              filter === "open"
                ? "No open incidents right now. Switch to All to review earlier reports."
                : filter === "closed"
                  ? "Resolved and rejected reports will appear here after custodians close them."
                  : "Submitted equipment issues and resolution notes will appear here."
            }
            icon="wrench"
            title={
              filter === "open" ? "No open defect reports" : filter === "closed" ? "No closed defect reports" : "No defect reports yet"
            }
          />
        ) : null
      }
      header={(
        <ConsoleHeader
          eyebrow="Incident desk"
          inset={false}
          right={<HeaderIconButton accessibilityLabel="Refresh defect reports" icon="refresh" loading={isLoading} onPress={refresh} />}
          title="Defect reports"
        >
          <ReadoutStrip
            items={[
              { label: "Open", tone: openCount ? "warning" : "neutral", value: openCount },
              { label: "Resolved", tone: resolvedCount ? "success" : "neutral", value: resolvedCount },
              { label: "Total", value: reports.length }
            ]}
          />
        </ConsoleHeader>
      )}
      includeHeaderInset
      keyExtractor={(report) => report.id}
      listHeader={(
        <>
          <SegmentedControl
            counts={{ all: reports.length, closed: reports.length - openCount, open: openCount }}
            onChange={setFilter}
            options={reportFilters}
            value={filter}
          />
          {error ? <Notice tone="danger">{error}</Notice> : null}
          {!hasLoaded && isLoading ? (
            <>
              <SkeletonCard lines={3} />
              <SkeletonCard lines={4} />
            </>
          ) : null}
        </>
      )}
      renderItem={({ item: report }) => <ReportCard report={report} />}
    />
  );
}

function ReportCard({ report }: { report: MobileDefectReport }) {
  const tone = getDefectStatusTone(report.status) as Tone;
  const icon = report.status === "resolved" ? "check" : report.status === "rejected" ? "close" : "wrench";

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <IconTile icon={icon} size={38} tone={tone} />
        <View style={styles.copy}>
          <Text numberOfLines={2} style={styles.title}>{report.title}</Text>
          <Text numberOfLines={1} style={styles.meta}>
            ASSET {formatReference(report.assetId)} · {formatRelativeTime(report.createdAt).toUpperCase()}
          </Text>
        </View>
        <Badge label={formatStatusLabel(report.status)} tone={tone} />
      </View>
      <Text numberOfLines={4} style={styles.body}>{report.description}</Text>
      {report.resolutionNotes ? (
        <View style={styles.resolution}>
          <Text style={styles.resolutionLabel}>CUSTODIAN NOTE</Text>
          <Text style={styles.resolutionText}>{report.resolutionNotes}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.muted,
    ...typography.body
  },
  card: {
    gap: 10,
    padding: 14
  },
  copy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  meta: {
    color: colors.subtle,
    fontFamily: fonts.mono,
    fontSize: 10.5
  },
  resolution: {
    backgroundColor: colors.surfaceGlass,
    borderLeftColor: colors.borderStrong,
    borderLeftWidth: 2,
    borderRadius: 6,
    gap: 3,
    paddingHorizontal: 11,
    paddingVertical: 9
  },
  resolutionLabel: {
    color: colors.subtle,
    ...typography.eyebrow,
    fontSize: 9.5
  },
  resolutionText: {
    color: colors.text,
    fontSize: 13.5,
    lineHeight: 19
  },
  title: {
    color: colors.text,
    ...typography.headline
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 11
  }
});
