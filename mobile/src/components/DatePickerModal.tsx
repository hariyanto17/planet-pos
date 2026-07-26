import React, { useState } from "react";
import { StyleSheet, Text, View, Modal, TouchableOpacity } from "react-native";

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (dateStr: string) => void;
  initialDateStr?: string;
}

export default function DatePickerModal({
  visible,
  onClose,
  onSelect,
  initialDateStr,
}: DatePickerModalProps) {
  const today = new Date();
  const initDate = initialDateStr ? new Date(initialDateStr) : today;
  const [currentYear, setCurrentYear] = useState(initDate.getFullYear() || today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(
    initDate.getMonth() !== undefined ? initDate.getMonth() : today.getMonth()
  );

  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const days = [];
  // Empty slots for previous month padding
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handleSelectDay = (day: number) => {
    const formattedMonth = (currentMonth + 1).toString().padStart(2, "0");
    const formattedDay = day.toString().padStart(2, "0");
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    onSelect(dateStr);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
              <Text style={styles.navText}>{"<"}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {months[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
              <Text style={styles.navText}>{">"}</Text>
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((dayName) => (
              <Text key={dayName} style={styles.weekLabel}>
                {dayName}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {days.map((day, idx) => (
              <View key={idx} style={styles.gridCell}>
                {day !== null ? (
                  <TouchableOpacity
                    style={styles.dayCell}
                    onPress={() => handleSelectDay(day)}
                  >
                    <Text style={styles.dayText}>{day}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>

          {/* Cancel button */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Batal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 340,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navBtn: {
    padding: 8,
    width: 36,
    alignItems: "center",
  },
  navText: {
    color: "#818cf8",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerTitle: {
    color: "#f4f4f5",
    fontSize: 16,
    fontWeight: "bold",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
    paddingBottom: 6,
  },
  weekLabel: {
    color: "#71717a",
    width: "14%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  gridCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 2,
  },
  dayCell: {
    width: "85%",
    height: "85%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "#27272a",
  },
  dayText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "500",
  },
  closeBtn: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#27272a",
    borderRadius: 8,
  },
  closeBtnText: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "bold",
  },
});