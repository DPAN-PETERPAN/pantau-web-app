const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "Minggu N · Bulan Tahun" — minggu direset di awal tiap bulan (minggu 1 = tanggal 1-7, dst). */
export function currentPeriodLabel(date: Date = new Date()): string {
  const week = Math.ceil(date.getDate() / 7);
  return `Minggu ${week} · ${BULAN[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateID(d: Date): string {
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTimeID(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
