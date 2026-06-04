import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  bookingDurationHours,
  createBookingRange,
  formatBookingDateTime,
  isFutureBookingRange,
  type BookingDurationHours,
  type BookingRange
} from "@labtrack/shared";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Notice } from "@/components/ui";
import { colors, spacing } from "@/constants/theme";

type PickerMode = "date" | "time";

type BookingSchedulePickerProps = {
  disabled?: boolean;
  now: Date;
  onRangeChange: (range: BookingRange) => void;
  range: BookingRange;
};

export function BookingSchedulePicker({ disabled = false, now, onRangeChange, range }: BookingSchedulePickerProps) {
  const [visiblePicker, setVisiblePicker] = useState<PickerMode | null>(null);
  const timezoneSource = useMemo(resolveTimezoneSource, []);
  const isFutureRange = isFutureBookingRange(range, now);

  function openPicker(mode: PickerMode) {
    if (disabled) {
      return;
    }

    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        display: mode === "date" ? "calendar" : "clock",
        minimumDate: mode === "date" ? now : undefined,
        mode,
        onChange: (event, selectedDate) => handlePickerChange(mode, event, selectedDate),
        value: range.startAt
      });
      return;
    }

    setVisiblePicker((currentMode) => (currentMode === mode ? null : mode));
  }

  function handlePickerChange(mode: PickerMode, event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android" || event.type === "dismissed") {
      setVisiblePicker(null);
    }

    if (event.type !== "set" || !selectedDate) {
      return;
    }

    const nextStartAt = mode === "date" ? mergeSelectedDate(range.startAt, selectedDate) : mergeSelectedTime(range.startAt, selectedDate);
    onRangeChange(createBookingRange(nextStartAt, range.durationHours));
  }

  function handleDurationChange(durationHours: BookingDurationHours) {
    if (disabled || durationHours === range.durationHours) {
      return;
    }

    onRangeChange(createBookingRange(range.startAt, durationHours));
  }

  return (
    <View style={styles.container}>
      <View style={styles.pickerRows}>
        <PickerRow
          disabled={disabled}
          label="Date"
          onPress={() => openPicker("date")}
          value={formatPickerDate(range.startAt)}
        />
        <PickerRow
          disabled={disabled}
          label="Start time"
          onPress={() => openPicker("time")}
          value={formatPickerTime(range.startAt)}
        />
      </View>

      {visiblePicker ? (
        <View style={styles.inlinePicker}>
          <DateTimePicker
            display={visiblePicker === "date" ? "inline" : "spinner"}
            minimumDate={visiblePicker === "date" ? now : undefined}
            mode={visiblePicker}
            onChange={(event, selectedDate) => handlePickerChange(visiblePicker, event, selectedDate)}
            value={range.startAt}
          />
        </View>
      ) : null}

      <View style={styles.durationGroup}>
        <Text style={styles.groupLabel}>Duration</Text>
        <View style={styles.chipRow}>
          {bookingDurationHours.map((durationHours) => {
            const selected = durationHours === range.durationHours;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled, selected }}
                disabled={disabled}
                hitSlop={8}
                key={durationHours}
                onPress={() => handleDurationChange(durationHours)}
                style={({ pressed }) => [
                  styles.durationChip,
                  selected ? styles.durationChipSelected : null,
                  disabled ? styles.disabled : pressed ? styles.pressed : null
                ]}
              >
                <Text style={[styles.durationChipText, selected ? styles.durationChipTextSelected : null]}>
                  {durationHours} {durationHours === 1 ? "hour" : "hours"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.summary}>
        <SummaryLine label="Start" value={formatBookingDateTime(range.startAt)} />
        <SummaryLine label="End" value={formatBookingDateTime(range.endAt)} />
        <SummaryLine label="Duration" value={`${range.durationHours} ${range.durationHours === 1 ? "hour" : "hours"}`} />
        <SummaryLine label="Timezone" value={timezoneSource} />
      </View>

      {!isFutureRange ? <Notice tone="warning">Choose a start time later than now.</Notice> : null}
    </View>
  );
}

function PickerRow({
  disabled,
  label,
  onPress,
  value
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable
      accessibilityLabel={`Select borrow ${label.toLowerCase()}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.pickerRow, disabled ? styles.disabled : pressed ? styles.pressed : null]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.rowValue}>
        {value}
      </Text>
    </Pressable>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text selectable style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

function mergeSelectedDate(currentStartAt: Date, selectedDate: Date) {
  return new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    currentStartAt.getHours(),
    currentStartAt.getMinutes(),
    0,
    0
  );
}

function mergeSelectedTime(currentStartAt: Date, selectedTime: Date) {
  return new Date(
    currentStartAt.getFullYear(),
    currentStartAt.getMonth(),
    currentStartAt.getDate(),
    selectedTime.getHours(),
    selectedTime.getMinutes(),
    0,
    0
  );
}

function formatPickerDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    weekday: "short",
    year: "numeric"
  });
}

function formatPickerTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
}

function resolveTimezoneSource() {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timeZone ? `Device local time (${timeZone})` : "Device local time";
  } catch {
    return "Device local time";
  }
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  container: {
    gap: 12
  },
  disabled: {
    opacity: 0.58
  },
  durationChip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: spacing.controlRadius,
    borderWidth: 1,
    minHeight: 42,
    minWidth: 86,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  durationChipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary
  },
  durationChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18
  },
  durationChipTextSelected: {
    color: colors.primaryDark
  },
  durationGroup: {
    gap: 8
  },
  groupLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  inlinePicker: {
    borderColor: colors.border,
    borderRadius: spacing.radius,
    borderWidth: 1,
    overflow: "hidden"
  },
  pickerRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: spacing.controlRadius,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  pickerRows: {
    gap: 8
  },
  pressed: {
    opacity: 0.82
  },
  rowLabel: {
    color: colors.muted,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  rowValue: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right"
  },
  summary: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: spacing.radius,
    borderWidth: 1,
    gap: 9,
    padding: 12
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  summaryLine: {
    gap: 2
  },
  summaryValue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 19
  }
});
