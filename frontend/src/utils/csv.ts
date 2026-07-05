import { PatientProgressExportRow } from "@/types";

/**
 * Export an array of flat, JSON-serializable rows to a downloaded CSV file.
 *
 * Generic over `T extends object` (rather than a `Record<string, ...>`
 * shape) so callers can pass any report-row interface — including the
 * Title Case-keyed report types in `@/types` — without needing an explicit
 * index signature. The header row is derived from whatever keys are
 * present on the first row.
 */
export function downloadCSV<T extends object>(filename: string, rows: T[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]) as (keyof T)[];
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportPatientProgress(patients: PatientProgressExportRow[]) {
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


