import { router } from "expo-router";
import { StyleSheet } from "react-native";
import { AppIcon } from "@/components/icons";
import {
  Card,
  ConsoleHeader,
  EmptyState,
  HeaderIconButton,
  IconTile,
  ListRow,
  Notice,
  ScreenFlatList,
  SkeletonCard,
  formatReference,
  formatRelativeTime
} from "@/components/ui";
import { colors } from "@/constants/theme";
import { useTicketThreads } from "@/lib/use-ticket-threads";

export default function TicketScreen() {
  const { error, hasLoaded, isLoading, refresh, threads } = useTicketThreads();

  return (
    <ScreenFlatList
      data={threads}
      empty={hasLoaded && !isLoading ? <EmptyState body="Borrowing and defect conversations will appear after a thread is created." icon="ticket" title="No ticket threads yet" /> : null}
      header={(
        <ConsoleHeader
          caption="Conversations stay attached to the borrowing or defect they started from."
          eyebrow={`Support · ${threads.length} threads`}
          inset={false}
          right={<HeaderIconButton accessibilityLabel="Refresh threads" icon="refresh" loading={isLoading} onPress={refresh} />}
          title="Lab support"
        />
      )}
      includeHeaderInset
      keyExtractor={(thread) => thread.id}
      listHeader={
        error || (!hasLoaded && isLoading) ? (
          <>
            {error ? <Notice tone="danger">{error}</Notice> : null}
            {!hasLoaded && isLoading ? (
              <>
                <SkeletonCard lines={2} />
                <SkeletonCard lines={2} />
              </>
            ) : null}
          </>
        ) : <></>
      }
      renderItem={({ item: thread }) => {
        const isBooking = thread.subjectType === "booking";
        return (
          <Card style={styles.threadCard}>
            <ListRow
              leading={<IconTile icon={isBooking ? "borrow" : "wrench"} tone={isBooking ? "info" : "warning"} />}
              meta={`${isBooking ? "BORROWING" : "DEFECT"} #${formatReference(thread.bookingId ?? thread.defectReportId ?? thread.id)} · ${formatRelativeTime(thread.createdAt).toUpperCase()}`}
              onPress={() => router.push({ pathname: "/ticket/[threadId]", params: { threadId: thread.id } })}
              subtitle="Tap to open the conversation"
              title={isBooking ? "Borrowing request" : "Defect report"}
              trailing={<AppIcon color={colors.subtle} name="chevron-forward" size={16} />}
            />
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  threadCard: {
    gap: 0,
    paddingVertical: 2
  }
});
