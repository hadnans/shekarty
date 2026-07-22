export interface Category {
  id: string;
  icon: string;
  nameEn: string;
  nameAr: string;
  color: string;
  sectionKey?: string;
}

export interface Product {
  id: string;
  nameEn: string;
  nameAr: string;
  brandEn: string;
  brandAr: string;
  weight: string;
  todayPrice: number;
  yesterdayPrice: number;
  rating: number;
  icon: string;
  categoryId: string;
}

export interface Deal {
  id: string;
  productEn: string;
  productAr: string;
  dealPrice: number;
  originalPrice: number;
  discount: number;
  icon: string;
}

// Section order for product grouping
export const sectionOrder: string[] = [
  "rice",
  "pasta",
  "oil",
  "tomato",
  "sugar",
  "tea",
];

export const categories: Category[] = [
  { id: "rice", icon: "🍚", nameEn: "Rice & Grains", nameAr: "أرز وحبوب", color: "#F5F5F5", sectionKey: "riceSection" },
  { id: "pasta", icon: "🍝", nameEn: "Pasta & Noodles", nameAr: "مكرونة ونعناع", color: "#F5F5F5", sectionKey: "pastaSection" },
  { id: "tomato", icon: "🥫", nameEn: "Canned Goods", nameAr: "معلبات", color: "#F5F5F5", sectionKey: "tomatoSection" },
  { id: "oil", icon: "🫒", nameEn: "Oils & Fats", nameAr: "زيوت ودهون", color: "#F5F5F5", sectionKey: "oilSection" },
  { id: "sugar", icon: "🍬", nameEn: "Sugar & Sweeteners", nameAr: "سكر ومحليات", color: "#F5F5F5", sectionKey: "sugarSection" },
  { id: "flour", icon: "🌾", nameEn: "Flour", nameAr: "دقيق", color: "#F5F5F5" },
  { id: "beans", icon: "🫘", nameEn: "Beans", nameAr: "فول", color: "#F5F5F5" },
  { id: "tea", icon: "🍵", nameEn: "Tea & Coffee", nameAr: "شاي وقهوة", color: "#F5F5F5", sectionKey: "teaSection" },
  { id: "coffee", icon: "☕", nameEn: "Coffee", nameAr: "قهوة", color: "#F5F5F5", sectionKey: "teaSection" },
  { id: "cleaning", icon: "🧹", nameEn: "Cleaning", nameAr: "تنظيف", color: "#F5F5F5" },
];

export const products: Product[] = [
  {
    id: "p1",
    nameEn: "Premium Rice",
    nameAr: "أرز ممتاز",
    brandEn: "Al Doha",
    brandAr: "الضحى",
    weight: "1kg",
    todayPrice: 25,
    yesterdayPrice: 27,
    rating: 4.5,
    icon: "🍚",
    categoryId: "rice",
  },
  {
    id: "p2",
    nameEn: "Premium Rice",
    nameAr: "أرز ممتاز",
    brandEn: "Al Doha",
    brandAr: "الضحى",
    weight: "5kg",
    todayPrice: 110,
    yesterdayPrice: 115,
    rating: 4.7,
    icon: "🍚",
    categoryId: "rice",
  },
  {
    id: "p3",
    nameEn: "Pasta",
    nameAr: "مكرونة",
    brandEn: "El Maleka",
    brandAr: "الملكة",
    weight: "500g",
    todayPrice: 15,
    yesterdayPrice: 16,
    rating: 4.3,
    icon: "🍝",
    categoryId: "pasta",
  },
  {
    id: "p4",
    nameEn: "Pasta",
    nameAr: "مكرونة",
    brandEn: "Regina",
    brandAr: "رجينا",
    weight: "500g",
    todayPrice: 14.5,
    yesterdayPrice: 15.5,
    rating: 4.1,
    icon: "🍝",
    categoryId: "pasta",
  },
  {
    id: "p5",
    nameEn: "Tomato Paste",
    nameAr: "صلصة طماطم",
    brandEn: "Al Ain",
    brandAr: "العين",
    weight: "200g",
    todayPrice: 8,
    yesterdayPrice: 9,
    rating: 4.6,
    icon: "🥫",
    categoryId: "tomato",
  },
  {
    id: "p6",
    nameEn: "Tomato Paste",
    nameAr: "صلصة طماطم",
    brandEn: "El Wadi",
    brandAr: "الوادي",
    weight: "200g",
    todayPrice: 7.5,
    yesterdayPrice: 8.5,
    rating: 4.2,
    icon: "🥫",
    categoryId: "tomato",
  },
  {
    id: "p7",
    nameEn: "Cooking Oil",
    nameAr: "زيت طعام",
    brandEn: "Crystal",
    brandAr: "كريستال",
    weight: "1L",
    todayPrice: 65,
    yesterdayPrice: 70,
    rating: 4.4,
    icon: "🫒",
    categoryId: "oil",
  },
  {
    id: "p8",
    nameEn: "Cooking Oil",
    nameAr: "زيت طعام",
    brandEn: "El Hanim",
    brandAr: "الخانم",
    weight: "1L",
    todayPrice: 63,
    yesterdayPrice: 68,
    rating: 4.3,
    icon: "🫒",
    categoryId: "oil",
  },
  {
    id: "p9",
    nameEn: "Sugar",
    nameAr: "سكر",
    brandEn: "Local",
    brandAr: "محلي",
    weight: "1kg",
    todayPrice: 22,
    yesterdayPrice: 24,
    rating: 4.0,
    icon: "🍬",
    categoryId: "sugar",
  },
  {
    id: "p10",
    nameEn: "Tea",
    nameAr: "شاي",
    brandEn: "Local",
    brandAr: "محلي",
    weight: "250g",
    todayPrice: 18,
    yesterdayPrice: 20,
    rating: 4.2,
    icon: "🍵",
    categoryId: "tea",
  },
];

export const deals: Deal[] = [
  {
    id: "d1",
    productEn: "Premium Rice 5kg",
    productAr: "أرز ممتاز 5 كيلو",
    dealPrice: 99,
    originalPrice: 115,
    discount: 14,
    icon: "🍚",
  },
  {
    id: "d2",
    productEn: "Pasta (Buy 2)",
    productAr: "مكرونة (اشتري 2)",
    dealPrice: 25,
    originalPrice: 30,
    discount: 17,
    icon: "🍝",
  },
  {
    id: "d3",
    productEn: "Cooking Oil",
    productAr: "زيت طعام",
    dealPrice: 55,
    originalPrice: 70,
    discount: 21,
    icon: "🫒",
  },
  {
    id: "d4",
    productEn: "Sugar 2kg",
    productAr: "سكر 2 كيلو",
    dealPrice: 38,
    originalPrice: 48,
    discount: 21,
    icon: "🍬",
  },
];
