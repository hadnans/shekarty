// GGH — Gomla Go Home (جملة لحد البيت)
// Money formatting utilities — Re-exports from src/types/ggh.ts plus convenience aliases
// All values are integer piastres (EGP 14.50 = 1450)

// Re-export all money functions from the canonical source
export {
  type Piastres,
  toPiastres,
  fromPiastres,
  formatPrice,
  formatPriceWithCurrency,
  calcDiscountPercent,
  calcSavings,
  multiplyPiastres,
  sumPiastres,
  isFree,
  egpToPiastres,
  piastresToEgp,
} from '@/types/ggh';
