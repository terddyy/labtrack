import { useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "@/components/icons";
import { EmptyState, Notice, SkeletonCard } from "@/components/ui";
import { colors, fonts } from "@/constants/theme";
import { useCurrentProfile } from "@/lib/auth";
import { useTicketThread } from "@/lib/use-ticket-thread";

export default function TicketThreadScreen() {
  const auth = useCurrentProfile();
  const insets = useSafeAreaInsets();
  // Native stack header: status bar inset + 56pt bar.
  const headerHeight = insets.top + 56;
  const scrollRef = useRef<ScrollView>(null);
  const { threadId } = useLocalSearchParams<{ threadId?: string }>();
  const { body, error, hasLoaded, isLoading, isSending, messages, refresh, send, setBody } = useTicketThread(threadId);
  const canSend = !isSending && Boolean(body.trim());

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
      style={styles.screen}
    >
      <View style={styles.threadBar}>
        <View style={styles.threadBarDot} />
        <Text numberOfLines={1} style={styles.threadBarText}>
          THREAD #{(threadId ?? "").slice(0, 8).toUpperCase()} · VISIBLE TO CUSTODIANS
        </Text>
        <Pressable accessibilityLabel="Refresh messages" accessibilityRole="button" disabled={isLoading} hitSlop={10} onPress={refresh}>
          {isLoading ? <ActivityIndicator color={colors.inkMuted} size="small" /> : <AppIcon color={colors.inkMuted} name="refresh" size={16} />}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.messages}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
      >
        {error ? <Notice tone="danger">{error}</Notice> : null}
        {!hasLoaded && isLoading ? (
          <>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </>
        ) : null}
        {!messages.length && hasLoaded && !isLoading ? (
          <EmptyState body="Use the reply field below to start the conversation on this thread." icon="message" title="No messages yet" />
        ) : null}
        {messages.map((message, index) => {
          const isMine = auth.status === "ready" && message.senderId === auth.profile.id;
          const previous = messages[index - 1];
          const isGrouped = previous ? previous.senderId === message.senderId : false;

          return (
            <View key={message.id} style={[styles.messageWrap, isMine ? styles.messageWrapMine : null, isGrouped ? styles.messageGrouped : null]}>
              {!isGrouped ? <Text style={styles.sender}>{isMine ? "You" : "Custodian"}</Text> : null}
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text selectable style={[styles.bubbleText, isMine ? styles.bubbleTextMine : null]}>{message.body}</Text>
              </View>
              <Text style={styles.timestamp}>{formatMessageTime(message.createdAt)}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          accessibilityLabel="Reply"
          multiline
          onChangeText={setBody}
          placeholder="Write a message…"
          placeholderTextColor={colors.subtle}
          style={styles.input}
          value={body}
        />
        <Pressable
          accessibilityLabel="Send message"
          accessibilityRole="button"
          accessibilityState={{ busy: isSending, disabled: !canSend }}
          disabled={!canSend}
          onPress={send}
          style={({ pressed }) => [styles.sendButton, !canSend ? styles.sendDisabled : pressed ? styles.sendPressed : null]}
        >
          {isSending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <AppIcon color="#FFFFFF" name="send" size={19} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleString(undefined, { day: "numeric", hour: "numeric", minute: "2-digit", month: "short" });
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 18,
    maxWidth: "100%",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6
  },
  bubbleText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21
  },
  bubbleTextMine: {
    color: "#FFFFFF"
  },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth
  },
  composer: {
    alignItems: "flex-end",
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10
  },
  input: {
    backgroundColor: colors.surfaceGlass,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 44,
    paddingBottom: 11,
    paddingHorizontal: 16,
    paddingTop: 11
  },
  messageGrouped: {
    marginTop: -8
  },
  messageWrap: {
    alignItems: "flex-start",
    alignSelf: "flex-start",
    gap: 4,
    maxWidth: "84%"
  },
  messageWrapMine: {
    alignItems: "flex-end",
    alignSelf: "flex-end"
  },
  messages: {
    alignSelf: "center",
    flexGrow: 1,
    gap: 14,
    maxWidth: 520,
    padding: 16,
    width: "100%"
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  sendDisabled: {
    backgroundColor: colors.borderStrong
  },
  sendPressed: {
    backgroundColor: colors.primaryDark
  },
  sender: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 4
  },
  threadBar: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderTopColor: colors.inkBorder,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  threadBarDot: {
    backgroundColor: colors.mint,
    borderRadius: 3,
    height: 6,
    width: 6
  },
  threadBarText: {
    color: colors.inkMuted,
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 1
  },
  timestamp: {
    color: colors.subtle,
    fontFamily: fonts.mono,
    fontSize: 10,
    paddingHorizontal: 4
  }
});
