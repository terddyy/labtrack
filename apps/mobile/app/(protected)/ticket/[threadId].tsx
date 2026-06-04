import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, EmptyState, Field, Notice, ScreenScrollView } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import { useTicketThread } from "@/lib/use-ticket-thread";

export default function TicketThreadScreen() {
  const auth = useCurrentProfile();
  const { threadId } = useLocalSearchParams<{ threadId?: string }>();
  const { body, error, isLoading, isSending, messages, refresh, send, setBody } = useTicketThread(threadId);

  return (
    <ScreenScrollView>
      <Card style={styles.heroCard}>
        <View style={styles.headerRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>Thread</Text>
            <Text style={styles.heroTitle}>Shared support conversation.</Text>
            <Text style={styles.heroCaption}>Messages are visible to LABTRACK custodians attached to this workflow.</Text>
          </View>
        </View>
        <Button disabled={isLoading} fullWidth={false} loading={isLoading} onPress={refresh} variant="secondary">
          Refresh
        </Button>
      </Card>
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
                <Text style={styles.senderText}>{isMine ? "You" : "Custodian"}</Text>
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
    gap: 7
  },
  heroKicker: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  heroTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 30
  },
  messageBody: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21
  },
  messageCard: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 10,
    gap: 7,
    maxWidth: "90%"
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
    gap: 12
  },
  myMessageCard: {
    alignSelf: "flex-end",
    backgroundColor: colors.primaryMuted,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 10,
    borderColor: "rgba(255,255,255,0.84)"
  },
  replyCard: {
    gap: 14,
    padding: 18
  },
  senderText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "900"
  }
});
