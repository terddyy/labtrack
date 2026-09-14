import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppIcon, type AppIconName } from "@/components/icons";
import {
  Button,
  Card,
  ConsoleHeader,
  EmptyState,
  Field,
  HeaderIconButton,
  IconTile,
  ListRow,
  Notice,
  ScreenFlatList,
  SkeletonCard,
  formatReference,
  formatRelativeTime,
  type Tone
} from "@/components/ui";
import { colors, typography } from "@/constants/theme";
import { createGeneralTicket, formatApiError, type MobileTicketThread } from "@/lib/labtrack-api";
import { useTicketThreads } from "@/lib/use-ticket-threads";

export default function TicketScreen() {
  const { error, hasLoaded, isLoading, refresh, threads } = useTicketThreads();
  const [isComposing, setIsComposing] = useState(false);

  return (
    <ScreenFlatList
      data={threads}
      empty={hasLoaded && !isLoading ? <EmptyState body="Start a new message above, or open a borrowing or defect conversation." icon="ticket" title="No ticket threads yet" /> : null}
      header={(
        <ConsoleHeader
          caption="Message custodians anytime, or continue a borrowing or defect conversation."
          eyebrow={`Support · ${threads.length} threads`}
          inset={false}
          right={<HeaderIconButton accessibilityLabel="Refresh threads" icon="refresh" loading={isLoading} onPress={refresh} />}
          title="Lab support"
        />
      )}
      includeHeaderInset
      keyExtractor={(thread) => thread.id}
      listHeader={
        <>
          {isComposing ? (
            <NewTicketComposer
              onCancel={() => setIsComposing(false)}
              onCreated={(thread) => {
                setIsComposing(false);
                void refresh();
                router.push({ pathname: "/ticket/[threadId]", params: { threadId: thread.id } });
              }}
            />
          ) : (
            <Button icon="message" onPress={() => setIsComposing(true)}>
              New message to custodians
            </Button>
          )}
          {error ? <Notice tone="danger">{error}</Notice> : null}
          {!hasLoaded && isLoading ? (
            <>
              <SkeletonCard lines={2} />
              <SkeletonCard lines={2} />
            </>
          ) : null}
        </>
      }
      renderItem={({ item: thread }) => {
        const display = describeThread(thread);
        return (
          <Card style={styles.threadCard}>
            <ListRow
              leading={<IconTile icon={display.icon} tone={display.tone} />}
              meta={`${display.kind} · ${formatRelativeTime(thread.createdAt).toUpperCase()}`}
              onPress={() => router.push({ pathname: "/ticket/[threadId]", params: { threadId: thread.id } })}
              subtitle="Tap to open the conversation"
              title={display.title}
              trailing={<AppIcon color={colors.subtle} name="chevron-forward" size={16} />}
            />
          </Card>
        );
      }}
    />
  );
}

function NewTicketComposer({ onCancel, onCreated }: { onCancel: () => void; onCreated: (thread: MobileTicketThread) => void }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const canSend = !isSending && Boolean(subject.trim()) && Boolean(body.trim());

  async function handleSend() {
    setIsSending(true);
    setError(null);

    try {
      onCreated(await createGeneralTicket({ subject, body }));
    } catch (sendError) {
      setError(formatApiError(sendError));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card style={styles.composer} tint="blue">
      <View style={styles.composerHeader}>
        <Text style={styles.eyebrow}>NEW MESSAGE</Text>
        <Text style={styles.composerCaption}>Custodians are notified and reply in this thread.</Text>
      </View>
      <Field label="Subject" maxLength={120} onChangeText={setSubject} placeholder="e.g. Question about lab hours" value={subject} />
      <Field label="Message" maxLength={2000} multiline onChangeText={setBody} placeholder="Write your message" value={body} />
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <View style={styles.composerActions}>
        <Button disabled={isSending} fullWidth={false} onPress={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button disabled={!canSend} fullWidth={false} icon="send" loading={isSending} onPress={() => void handleSend()}>
          Send
        </Button>
      </View>
    </Card>
  );
}

function describeThread(thread: MobileTicketThread): { icon: AppIconName; kind: string; title: string; tone: Tone } {
  if (thread.subjectType === "general") {
    return { icon: "message", kind: "GENERAL", title: thread.subject ?? "General message", tone: "secondary" };
  }

  const reference = formatReference(thread.bookingId ?? thread.defectReportId ?? thread.id);

  return thread.subjectType === "booking"
    ? { icon: "borrow", kind: `BORROWING #${reference}`, title: "Borrowing request", tone: "info" }
    : { icon: "wrench", kind: `DEFECT #${reference}`, title: "Defect report", tone: "warning" };
}

const styles = StyleSheet.create({
  composer: {
    gap: 12
  },
  composerActions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end"
  },
  composerCaption: {
    color: colors.muted,
    ...typography.caption
  },
  composerHeader: {
    gap: 3
  },
  eyebrow: {
    color: colors.muted,
    ...typography.eyebrow
  },
  threadCard: {
    gap: 0,
    paddingVertical: 2
  }
});
