import { ScrollView, Text, TextInput, View } from "react-native";
import { Button, Card, SectionTitle } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";

const messages = [
  { id: "1", sender: "Instructor", body: "I submitted a defect report for the router in the network laboratory." },
  { id: "2", sender: "Admin", body: "Received. Please keep the item in the laboratory cabinet while we inspect it." }
];

export default function TicketScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: spacing.page, gap: spacing.gap }}>
      <SectionTitle title="Ticket chat" caption="Conversations stay attached to the related booking or defect report." />
      {messages.map((message) => (
        <Card key={message.id} style={{ backgroundColor: message.sender === "Instructor" ? colors.primaryMuted : colors.surface }}>
          <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" }}>{message.sender}</Text>
          <Text selectable style={{ color: colors.text, lineHeight: 21 }}>{message.body}</Text>
        </Card>
      ))}
      <View style={{ gap: 10 }}>
        <TextInput
          placeholder="Type a message"
          placeholderTextColor={colors.muted}
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: 10,
            borderWidth: 1,
            color: colors.text,
            minHeight: 48,
            paddingHorizontal: 12
          }}
        />
        <Button>Send Message</Button>
      </View>
    </ScrollView>
  );
}
