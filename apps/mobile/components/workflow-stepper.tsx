import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "@/components/ui";
import { colors, fonts, typography } from "@/constants/theme";

export type WorkflowStep = {
  id: string;
  label: string;
  caption?: string;
};

type WorkflowStepperProps = {
  steps: WorkflowStep[];
  currentStep: number;
  onDismiss?: () => void;
  title?: string;
};

/** Progress rail: segmented track, mono step counter, current step caption. */
export function WorkflowStepper({ currentStep, onDismiss, steps, title }: WorkflowStepperProps) {
  const activeIndex = Math.max(0, Math.min(currentStep, steps.length - 1));
  const active = steps[activeIndex];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.counter}>
            {title ? `${title.toUpperCase()} · ` : ""}
            {String(activeIndex + 1).padStart(2, "0")}/{String(steps.length).padStart(2, "0")}
          </Text>
          <Text numberOfLines={1} style={styles.label}>{active?.label}</Text>
          {active?.caption ? <Text style={styles.caption}>{active.caption}</Text> : null}
        </View>
        {onDismiss ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onDismiss} style={({ pressed }) => [styles.dismiss, pressed ? styles.dismissPressed : null]}>
            <Text style={styles.dismissText}>Got it</Text>
          </Pressable>
        ) : null}
      </View>

      <View accessibilityLabel={`Step ${activeIndex + 1} of ${steps.length}`} style={styles.track}>
        {steps.map((step, index) => (
          <View key={step.id} style={styles.segmentWrap}>
            <View
              style={[
                styles.segment,
                index < activeIndex ? styles.segmentDone : null,
                index === activeIndex ? styles.segmentCurrent : null
              ]}
            />
            <Text numberOfLines={1} style={[styles.segmentLabel, index <= activeIndex ? styles.segmentLabelActive : null]}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: colors.muted,
    ...typography.caption
  },
  card: {
    gap: 14,
    padding: 14
  },
  counter: {
    color: colors.primary,
    ...typography.eyebrow
  },
  dismiss: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  dismissPressed: {
    opacity: 0.7
  },
  dismissText: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "600"
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  headerCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  label: {
    color: colors.text,
    ...typography.headline
  },
  segment: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 2,
    height: 4
  },
  segmentCurrent: {
    backgroundColor: colors.primary
  },
  segmentDone: {
    backgroundColor: colors.success
  },
  segmentLabel: {
    color: colors.subtle,
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.2
  },
  segmentLabelActive: {
    color: colors.muted
  },
  segmentWrap: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  track: {
    flexDirection: "row",
    gap: 4
  }
});
