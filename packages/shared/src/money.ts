// All money in HeavyHire is stored as whole PAISE (₹1 = 100 paise).
// Integers never have rounding errors, and Razorpay uses paise too.

/** ₹1,250.50 → 125050 */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** 125050 → 1250.5 */
export function toRupees(paise: number): number {
  return paise / 100;
}

/** 944000 → "₹9,440" (Indian digit grouping, paise shown only when non-zero) */
export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return (
    "₹" +
    rupees.toLocaleString("en-IN", {
      minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}
