"use strict";

/**
 * Currency helpers
 */
const krwFormatter = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
const numFormatter = new Intl.NumberFormat("ko-KR");

function parseKrwToInteger(value) {
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[^0-9-]/g, "");
  const parsed = parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatKrw(amount) {
  return krwFormatter.format(Math.round(amount || 0));
}

/**
 * Relationship basic deductions (KRW)
 */
const BasicDeduction = {
  spouse: 600_000_000,
  lineal_descendant_adult: 50_000_000,
  lineal_descendant_minor: 20_000_000,
  lineal_ascendant_adult: 50_000_000,
  lineal_ascendant_minor: 20_000_000,
  other_relatives: 10_000_000,
  others: 0,
};

/**
 * Gift tax progressive table (tax base in KRW)
 * rate as decimal, quickDeduction in KRW
 */
const GiftTaxBrackets = [
  { upTo: 100_000_000, rate: 0.10, quickDeduction: 0 },
  { upTo: 500_000_000, rate: 0.20, quickDeduction: 10_000_000 },
  { upTo: 1_000_000_000, rate: 0.30, quickDeduction: 60_000_000 },
  { upTo: 3_000_000_000, rate: 0.40, quickDeduction: 160_000_000 },
  { upTo: Infinity, rate: 0.50, quickDeduction: 460_000_000 },
];

function getBracket(taxBase) {
  for (const bracket of GiftTaxBrackets) {
    if (taxBase <= bracket.upTo) return bracket;
  }
  return GiftTaxBrackets[GiftTaxBrackets.length - 1];
}

/**
 * Calculate gift tax
 */
function calculateGiftTax(params) {
  const { giftAmount, relationship, applyReportingCredit } = params;

  const deduction = BasicDeduction[relationship] ?? 0;
  const taxableBase = Math.max(0, giftAmount - deduction);
  const bracket = getBracket(taxableBase);
  const computedTax = Math.max(0, taxableBase * bracket.rate - bracket.quickDeduction);
  const reportingCredit = applyReportingCredit ? Math.round(computedTax * 0.03) : 0;
  const totalTax = Math.max(0, computedTax - reportingCredit);

  return {
    deduction,
    taxableBase,
    rate: bracket.rate,
    quickDeduction: bracket.quickDeduction,
    computedTax,
    reportingCredit,
    totalTax,
  };
}

/**
 * Wire up UI
 */
const form = document.getElementById("gift-tax-form");
const giftAmountInput = document.getElementById("giftAmount");
const relationshipSelect = document.getElementById("relationship");
const applyReportingCreditInput = document.getElementById("applyReportingCredit");
const resetBtn = document.getElementById("resetBtn");

const resultsSection = document.getElementById("results");
const r_giftAmount = document.getElementById("r_giftAmount");
const r_deduction = document.getElementById("r_deduction");
const r_taxBase = document.getElementById("r_taxBase");
const r_rate = document.getElementById("r_rate");
const r_quickDeduction = document.getElementById("r_quickDeduction");
const r_computedTax = document.getElementById("r_computedTax");
const r_reportingCredit = document.getElementById("r_reportingCredit");
const r_totalTax = document.getElementById("r_totalTax");

// Format on blur for better UX
giftAmountInput.addEventListener("blur", () => {
  const raw = parseKrwToInteger(giftAmountInput.value);
  if (raw > 0) giftAmountInput.value = numFormatter.format(raw);
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const giftAmount = parseKrwToInteger(giftAmountInput.value);
  if (!Number.isFinite(giftAmount) || giftAmount <= 0) {
    alert("증여재산가액을 올바르게 입력해주세요.");
    return;
  }
  const relationship = relationshipSelect.value;
  const applyReportingCredit = !!applyReportingCreditInput.checked;

  const result = calculateGiftTax({ giftAmount, relationship, applyReportingCredit });

  r_giftAmount.textContent = formatKrw(giftAmount);
  r_deduction.textContent = formatKrw(result.deduction);
  r_taxBase.textContent = formatKrw(result.taxableBase);
  r_rate.textContent = `${Math.round(result.rate * 100)}%`;
  r_quickDeduction.textContent = formatKrw(result.quickDeduction);
  r_computedTax.textContent = formatKrw(result.computedTax);
  r_reportingCredit.textContent = formatKrw(result.reportingCredit);
  r_totalTax.textContent = formatKrw(result.totalTax);

  resultsSection.classList.remove("hidden");
});

resetBtn.addEventListener("click", () => {
  form.reset();
  resultsSection.classList.add("hidden");
});

