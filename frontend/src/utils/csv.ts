export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportPatientProgress(patients: any[]) {
  const rows = patients.map((p) => ({
    "Patient ID": p.id || "",
    "Name": p.name || "",
    "Email": p.email || "",
    "Program": p.program || "",
    "Enrollment Date": p.enrollmentDate || "",
    "Sessions Completed": p.sessionsCompleted || 0,
    "Sessions Missed": p.sessionsMissed || 0,
    "Attendance Rate": `${p.attendanceRate || 0}%`,
    "Medications Dispensed": p.medicationsDispensed || 0,
    "Adherence Rate": `${p.adherenceRate || 0}%`,
    "Status": p.status || "Active",
  }));
  downloadCSV(`patient-progress-${new Date().toISOString().split("T")[0]}.csv`, rows);
}


