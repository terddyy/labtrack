import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { RequireActiveProfile } from "@/components/auth-gate";
import { Button, Card, EmptyState, Field, Notice, ScreenScrollView, SectionTitle } from "@/components/ui";
import { colors } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import {
  formatApiError,
  listTicketMessages,
  sendTicketMessage,
  type MobileTicketMessage
} from "@/lib/labtrack-api";

export default function TicketThreadScreen() {
  return (
    <RequireActiveProfile>
      <TicketThreadContent />
    </RequireActiveProfile>
  );
}

function TicketThreadContent() {
  const auth = useCurrentProfile();
  const { threadId } = useLocalSearchParams<{ threadId?: string }>();
  const [messages, setMessages] = useState<MobileTicketMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!threadId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setMessages(await listTicketMessages(threadId));
    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  async function handleSend() {
    if (!threadId) {
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      await sendTicketMessage(threadId, body.trim());
      setBody("");
      await loadMessages();
    } catch (sendError) {
      setError(formatApiError(sendError));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <ScreenScrollView>
      <View style={styles.headerRow}>
        <SectionTitle title="Ticket chat" caption="Messages are shared with LABTRACK administrators." />
        <Button disabled={isLoading} fullWidth={false} loading={isLoading} onPress={loadMessages} variant="secondary">
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
        <Button disabled={isSending || !body.trim()} loading={isSending} onPress={handleSend}>
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
    borderColor: "#C3DED8"
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
