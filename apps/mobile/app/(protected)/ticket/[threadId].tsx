import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, EmptyState, Field, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import { useTicketThread } from "@/lib/use-ticket-thread";

export default function TicketThreadScreen() {
  const auth = useCurrentProfile();
  const { threadId } = useLocalSearchParams<{ threadId?: string }>();
  const { body, error, isLoading, isSending, messages, refresh, send, setBody } = useTicketThread(threadId);

  return (
    <ScreenScrollView>
      <View style={styles.headerRow}>
        <SectionTitle title="Ticket chat" caption="Messages are shared with LABTRACK administrators." />
        <Button disabled={isLoading} fullWidth={false} loading={isLoading} onPress={refresh} variant="secondary">
          Refresh
        </Button>
      </View>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {!messages.length && !isLoading ? (
        <EmptyState body="Use the reply field below to start the conversation on this thread." title="No messages yet" />
      ) : null}
      <View style={styles.messageList}>
        {messages.map((message) => {
          const isMine = auth.status === "ready" && message.senderId === auth.profile.id;

          return (
            <Card key={message.id} style={[styles.messageCard, isMine ? styles.myMessageCard : null]}>
              <View style={styles.messageMetaRow}>
                <Text style={styles.senderText}>{isMine ? "You" : "Admin"}</Text>
                <Text style={styles.messageDate}>{new Date(message.createdAt).toLocaleString()}</Text>
              </View>
              <Text style={styles.messageBody}>{message.body}</Text>
            </Card>
          );
        })}
      </View>
      <Card style={styles.replyCard}>
        <Field
          label="Reply"
          multiline
          onChangeText={setBody}
          placeholder="Type a message"
          value={body}
        />
        <Button disabled={isSending || !body.trim()} loading={isSending} onPress={send}>
          Send message
        </Button>
      </Card>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "flex-start",
    gap: 12
  },
  messageBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21
  },
  messageCard: {
    gap: 7
  },
  messageMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  messageDate: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right"
  },
  messageList: {
    gap: 10
  },
  myMessageCard: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.secondaryMuted
  },
  replyCard: {
    gap: 14
  },
  senderText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900"
  }
});
