// GGH Seed — Seed the database with sample data

import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/ggh/auth';
import { NextRequest, NextResponse } from 'next/server';

// ============================================
// SEED DATA — Categories
// ============================================

const CATEGORIES = [
  { slug: 'rice', nameEn: 'Rice', nameAr: 'أرز', icon: '🌾', color: '#FFF3E0', sortOrder: 1 },
  { slug: 'pasta', nameEn: 'Pasta', nameAr: 'مكرونة', icon: '🍝', color: '#FFE0B2', sortOrder: 2 },
  { slug: 'tomato', nameEn: 'Tomato Products', nameAr: 'طماطم', icon: '🍅', color: '#FFCDD2', sortOrder: 3 },
  { slug: 'oil', nameEn: 'Cooking Oil', nameAr: 'زيت', icon: '🫒', color: '#E8F5E9', sortOrder: 4 },
  { slug: 'sugar', nameEn: 'Sugar', nameAr: 'سكر', icon: '🍬', color: '#F3E5F5', sortOrder: 5 },
  { slug: 'flour', nameEn: 'Flour', nameAr: 'دقيق', icon: '🍞', color: '#FFF9C4', sortOrder: 6 },
  { slug: 'beans', nameEn: 'Beans & Legumes', nameAr: 'فول وبقوليات', icon: '🫘', color: '#EFEBE9', sortOrder: 7 },
  { slug: 'tea', nameEn: 'Tea', nameAr: 'شاي', icon: '🍵', color: '#C8E6C9', sortOrder: 8 },
  { slug: 'coffee', nameEn: 'Coffee', nameAr: 'قهوة', icon: '☕', color: '#D7CCC8', sortOrder: 9 },
  { slug: 'cleaning', nameEn: 'Cleaning', nameAr: 'منظفات', icon: '🧹', color: '#E1F5FE', sortOrder: 10 },
];

// ============================================
// SEED DATA — Products (prices in piastres!)
// ============================================

const CATEGORY_ICONS: Record<string, string> = {
  rice: '🍚',
  pasta: '🍝',
  tomato: '🍅',
  oil: '🫒',
  sugar: '🍬',
  flour: '🍞',
  beans: '🫘',
  tea: '🍵',
  coffee: '☕',
  cleaning: '🧹',
};

const PRODUCTS: {
  handle: string; nameEn: string; nameAr: string; brandEn: string; brandAr: string;
  weight: string; unit: string; categorySlug: string; todayPrice: number;
  yesterdayPrice: number | null; wholesalePrice: number | null; stock: number;
  isFeatured: boolean; isDeal: boolean; totalSold: number; rating: number;
}[] = [
  // Rice
  { handle: 'al-doha-premium-1kg', nameEn: 'Al Doha Premium Rice', nameAr: 'أرز الدوحا الممتاز', brandEn: 'Al Doha', brandAr: 'الدوحا', weight: '1 kg', unit: 'piece', categorySlug: 'rice', todayPrice: 2500, yesterdayPrice: 2700, wholesalePrice: 2200, stock: 500, isFeatured: true, isDeal: false, totalSold: 1250, rating: 4.5 },
  { handle: 'al-doha-premium-5kg', nameEn: 'Al Doha Premium Rice', nameAr: 'أرز الدوحا الممتاز', brandEn: 'Al Doha', brandAr: 'الدوحا', weight: '5 kg', unit: 'piece', categorySlug: 'rice', todayPrice: 11000, yesterdayPrice: 12000, wholesalePrice: 9800, stock: 300, isFeatured: true, isDeal: true, totalSold: 800, rating: 4.6 },
  { handle: 'abu-kors-rice-5kg', nameEn: 'Abu Kors Rice', nameAr: 'أرز أبو كرس', brandEn: 'Abu Kors', brandAr: 'أبو كرس', weight: '5 kg', unit: 'piece', categorySlug: 'rice', todayPrice: 9500, yesterdayPrice: null, wholesalePrice: 8500, stock: 200, isFeatured: false, isDeal: false, totalSold: 600, rating: 4.3 },
  { handle: 'shahrazad-rice-1kg', nameEn: 'Shahrazad Rice', nameAr: 'أرز شهرزاد', brandEn: 'Shahrazad', brandAr: 'شهرزاد', weight: '1 kg', unit: 'piece', categorySlug: 'rice', todayPrice: 2200, yesterdayPrice: 2400, wholesalePrice: 1900, stock: 400, isFeatured: false, isDeal: true, totalSold: 450, rating: 4.2 },

  // Pasta
  { handle: 'el-maleka-penne-500g', nameEn: 'El Maleka Penne Pasta', nameAr: 'مكرونة الملكة بن', brandEn: 'El Maleka', brandAr: 'الملكة', weight: '500 g', unit: 'piece', categorySlug: 'pasta', todayPrice: 1500, yesterdayPrice: null, wholesalePrice: 1300, stock: 600, isFeatured: true, isDeal: false, totalSold: 1500, rating: 4.4 },
  { handle: 'el-maleka-spaghetti-500g', nameEn: 'El Maleka Spaghetti', nameAr: 'مكرونة الملكة سباجيتي', brandEn: 'El Maleka', brandAr: 'الملكة', weight: '500 g', unit: 'piece', categorySlug: 'pasta', todayPrice: 1500, yesterdayPrice: null, wholesalePrice: 1300, stock: 600, isFeatured: false, isDeal: false, totalSold: 1200, rating: 4.4 },
  { handle: 'regina-penne-500g', nameEn: 'Regina Penne Pasta', nameAr: 'مكرونة ريجينا بن', brandEn: 'Regina', brandAr: 'ريجينا', weight: '500 g', unit: 'piece', categorySlug: 'pasta', todayPrice: 1450, yesterdayPrice: 1600, wholesalePrice: 1250, stock: 500, isFeatured: false, isDeal: true, totalSold: 900, rating: 4.3 },
  { handle: 'regina-macaroni-500g', nameEn: 'Regina Macaroni', nameAr: 'مكرونة ريجينا مقرونة', brandEn: 'Regina', brandAr: 'ريجينا', weight: '500 g', unit: 'piece', categorySlug: 'pasta', todayPrice: 1450, yesterdayPrice: null, wholesalePrice: 1250, stock: 450, isFeatured: false, isDeal: false, totalSold: 750, rating: 4.2 },

  // Tomato
  { handle: 'al-ain-tomato-200g', nameEn: 'Al Ain Tomato Paste', nameAr: 'صلصة طماطم العين', brandEn: 'Al Ain', brandAr: 'العين', weight: '200 g', unit: 'piece', categorySlug: 'tomato', todayPrice: 800, yesterdayPrice: null, wholesalePrice: 650, stock: 700, isFeatured: true, isDeal: false, totalSold: 2000, rating: 4.6 },
  { handle: 'al-ain-tomato-400g', nameEn: 'Al Ain Tomato Paste', nameAr: 'صلصة طماطم العين', brandEn: 'Al Ain', brandAr: 'العين', weight: '400 g', unit: 'piece', categorySlug: 'tomato', todayPrice: 1400, yesterdayPrice: 1500, wholesalePrice: 1150, stock: 500, isFeatured: false, isDeal: true, totalSold: 1600, rating: 4.6 },
  { handle: 'el-wadi-tomato-200g', nameEn: 'El Wadi Tomato Paste', nameAr: 'صلصة طماطم الوادي', brandEn: 'El Wadi', brandAr: 'الوادي', weight: '200 g', unit: 'piece', categorySlug: 'tomato', todayPrice: 750, yesterdayPrice: null, wholesalePrice: 600, stock: 600, isFeatured: false, isDeal: false, totalSold: 1100, rating: 4.3 },
  { handle: 'heinz-ketchup-500ml', nameEn: 'Heinz Tomato Ketchup', nameAr: 'كاتشب هاينز', brandEn: 'Heinz', brandAr: 'هاينز', weight: '500 ml', unit: 'piece', categorySlug: 'tomato', todayPrice: 3500, yesterdayPrice: null, wholesalePrice: 3000, stock: 200, isFeatured: false, isDeal: false, totalSold: 500, rating: 4.7 },

  // Oil
  { handle: 'crystal-oil-1l', nameEn: 'Crystal Cooking Oil', nameAr: 'زيت كريستال', brandEn: 'Crystal', brandAr: 'كريستال', weight: '1 L', unit: 'piece', categorySlug: 'oil', todayPrice: 6500, yesterdayPrice: 7000, wholesalePrice: 5800, stock: 400, isFeatured: true, isDeal: true, totalSold: 1800, rating: 4.5 },
  { handle: 'crystal-oil-2l', nameEn: 'Crystal Cooking Oil', nameAr: 'زيت كريستال', brandEn: 'Crystal', brandAr: 'كريستال', weight: '2 L', unit: 'piece', categorySlug: 'oil', todayPrice: 12500, yesterdayPrice: null, wholesalePrice: 11200, stock: 250, isFeatured: false, isDeal: false, totalSold: 900, rating: 4.5 },
  { handle: 'el-hanim-oil-1l', nameEn: 'El Hanim Cooking Oil', nameAr: 'زيت الحانم', brandEn: 'El Hanim', brandAr: 'الحانم', weight: '1 L', unit: 'piece', categorySlug: 'oil', todayPrice: 6300, yesterdayPrice: null, wholesalePrice: 5600, stock: 350, isFeatured: false, isDeal: false, totalSold: 1200, rating: 4.3 },
  { handle: 'safola-oil-1l', nameEn: 'Safola Cooking Oil', nameAr: 'زيت صافولا', brandEn: 'Safola', brandAr: 'صافولا', weight: '1 L', unit: 'piece', categorySlug: 'oil', todayPrice: 7200, yesterdayPrice: 7500, wholesalePrice: 6500, stock: 300, isFeatured: false, isDeal: true, totalSold: 700, rating: 4.4 },

  // Sugar
  { handle: 'local-sugar-1kg', nameEn: 'Local Sugar', nameAr: 'سكر بلدي', brandEn: 'Local', brandAr: 'بلدي', weight: '1 kg', unit: 'piece', categorySlug: 'sugar', todayPrice: 2200, yesterdayPrice: null, wholesalePrice: 1900, stock: 800, isFeatured: true, isDeal: false, totalSold: 2500, rating: 4.2 },
  { handle: 'local-sugar-5kg', nameEn: 'Local Sugar', nameAr: 'سكر بلدي', brandEn: 'Local', brandAr: 'بلدي', weight: '5 kg', unit: 'piece', categorySlug: 'sugar', todayPrice: 10000, yesterdayPrice: 11000, wholesalePrice: 8800, stock: 400, isFeatured: false, isDeal: true, totalSold: 1500, rating: 4.2 },
  { handle: 'luxury-sugar-1kg', nameEn: 'Luxury Refined Sugar', nameAr: 'سكر فاخر مكرر', brandEn: 'Luxury', brandAr: 'لكشري', weight: '1 kg', unit: 'piece', categorySlug: 'sugar', todayPrice: 2500, yesterdayPrice: null, wholesalePrice: 2200, stock: 300, isFeatured: false, isDeal: false, totalSold: 600, rating: 4.0 },

  // Flour
  { handle: 'baladna-flour-1kg', nameEn: 'Baladna Flour', nameAr: 'دقيق بلدنا', brandEn: 'Baladna', brandAr: 'بلدنا', weight: '1 kg', unit: 'piece', categorySlug: 'flour', todayPrice: 1400, yesterdayPrice: null, wholesalePrice: 1150, stock: 500, isFeatured: true, isDeal: false, totalSold: 1800, rating: 4.4 },
  { handle: 'el-rashidi-flour-1kg', nameEn: 'El Rashidi Flour', nameAr: 'دقيق الرشيدي', brandEn: 'El Rashidi', brandAr: 'الرشيدي', weight: '1 kg', unit: 'piece', categorySlug: 'flour', todayPrice: 1600, yesterdayPrice: 1800, wholesalePrice: 1350, stock: 400, isFeatured: false, isDeal: true, totalSold: 1100, rating: 4.3 },
  { handle: 'baladna-flour-5kg', nameEn: 'Baladna Flour', nameAr: 'دقيق بلدنا', brandEn: 'Baladna', brandAr: 'بلدنا', weight: '5 kg', unit: 'piece', categorySlug: 'flour', todayPrice: 6500, yesterdayPrice: null, wholesalePrice: 5600, stock: 250, isFeatured: false, isDeal: false, totalSold: 700, rating: 4.4 },

  // Beans
  { handle: 'el-rashidi-fava-400g', nameEn: 'El Rashidi Fava Beans', nameAr: 'فول الرشيدي', brandEn: 'El Rashidi', brandAr: 'الرشيدي', weight: '400 g', unit: 'piece', categorySlug: 'beans', todayPrice: 800, yesterdayPrice: null, wholesalePrice: 650, stock: 600, isFeatured: true, isDeal: false, totalSold: 2200, rating: 4.5 },
  { handle: 'el-rashidi-fava-800g', nameEn: 'El Rashidi Fava Beans', nameAr: 'فول الرشيدي', brandEn: 'El Rashidi', brandAr: 'الرشيدي', weight: '800 g', unit: 'piece', categorySlug: 'beans', todayPrice: 1500, yesterdayPrice: 1600, wholesalePrice: 1250, stock: 400, isFeatured: false, isDeal: true, totalSold: 1400, rating: 4.5 },
  { handle: 'cooperation-fava-400g', nameEn: 'Cooperation Fava Beans', nameAr: 'فول التعاون', brandEn: 'Cooperation', brandAr: 'التعاون', weight: '400 g', unit: 'piece', categorySlug: 'beans', todayPrice: 700, yesterdayPrice: null, wholesalePrice: 550, stock: 500, isFeatured: false, isDeal: false, totalSold: 1000, rating: 4.1 },
  { handle: 'lentils-1kg', nameEn: 'Brown Lentils', nameAr: 'عدس بني', brandEn: 'Local', brandAr: 'بلدي', weight: '1 kg', unit: 'piece', categorySlug: 'beans', todayPrice: 3500, yesterdayPrice: null, wholesalePrice: 3000, stock: 300, isFeatured: false, isDeal: false, totalSold: 650, rating: 4.2 },

  // Tea
  { handle: 'al-set-aziza-tea-250g', nameEn: 'Al Set Aziza Tea', nameAr: 'شاي الست عزيزة', brandEn: 'Al Set Aziza', brandAr: 'الست عزيزة', weight: '250 g', unit: 'piece', categorySlug: 'tea', todayPrice: 1800, yesterdayPrice: null, wholesalePrice: 1500, stock: 500, isFeatured: true, isDeal: false, totalSold: 1900, rating: 4.5 },
  { handle: 'gomhourya-tea-250g', nameEn: 'Gomhourya Tea', nameAr: 'شاي الجمهورية', brandEn: 'Gomhourya', brandAr: 'الجمهورية', weight: '250 g', unit: 'piece', categorySlug: 'tea', todayPrice: 1500, yesterdayPrice: 1700, wholesalePrice: 1250, stock: 400, isFeatured: false, isDeal: true, totalSold: 1200, rating: 4.3 },
  { handle: 'lipton-tea-100g', nameEn: 'Lipton Yellow Label Tea', nameAr: 'شاي ليبتون الأصفر', brandEn: 'Lipton', brandAr: 'ليبتون', weight: '100 g', unit: 'piece', categorySlug: 'tea', todayPrice: 2200, yesterdayPrice: null, wholesalePrice: 1900, stock: 300, isFeatured: false, isDeal: false, totalSold: 800, rating: 4.6 },
  { handle: 'koshari-tea-50g', nameEn: 'Koshari Tea Bags', nameAr: 'شاي كشري أكياس', brandEn: 'Koshari', brandAr: 'كشري', weight: '50 g', unit: 'piece', categorySlug: 'tea', todayPrice: 500, yesterdayPrice: null, wholesalePrice: 400, stock: 600, isFeatured: false, isDeal: false, totalSold: 900, rating: 4.0 },

  // Coffee
  { handle: 'habashi-coffee-250g', nameEn: 'Habashi Turkish Coffee', nameAr: 'قهوة حبشي', brandEn: 'Habashi', brandAr: 'حبشي', weight: '250 g', unit: 'piece', categorySlug: 'coffee', todayPrice: 4500, yesterdayPrice: null, wholesalePrice: 3800, stock: 250, isFeatured: true, isDeal: false, totalSold: 700, rating: 4.6 },
  { handle: 'saudi-coffee-250g', nameEn: 'Saudi Arabic Coffee', nameAr: 'قهوة سعودي', brandEn: 'Saudi', brandAr: 'سعودي', weight: '250 g', unit: 'piece', categorySlug: 'coffee', todayPrice: 3500, yesterdayPrice: 4000, wholesalePrice: 3000, stock: 300, isFeatured: false, isDeal: true, totalSold: 550, rating: 4.4 },
  { handle: 'bonge-coffee-200g', nameEn: 'Bonge Instant Coffee', nameAr: 'قهوة بونج فورية', brandEn: 'Bonge', brandAr: 'بونج', weight: '200 g', unit: 'piece', categorySlug: 'coffee', todayPrice: 5500, yesterdayPrice: null, wholesalePrice: 4800, stock: 200, isFeatured: false, isDeal: false, totalSold: 400, rating: 4.3 },
  { handle: 'nescafe-classic-200g', nameEn: 'Nescafe Classic', nameAr: 'نسكافيه كلاسيك', brandEn: 'Nescafe', brandAr: 'نسكافيه', weight: '200 g', unit: 'piece', categorySlug: 'coffee', todayPrice: 8000, yesterdayPrice: null, wholesalePrice: 7000, stock: 150, isFeatured: true, isDeal: false, totalSold: 600, rating: 4.7 },

  // Cleaning
  { handle: 'persil-detergent-1l', nameEn: 'Persil Detergent', nameAr: 'برسيل غسيل', brandEn: 'Persil', brandAr: 'برسيل', weight: '1 L', unit: 'piece', categorySlug: 'cleaning', todayPrice: 3500, yesterdayPrice: null, wholesalePrice: 3000, stock: 350, isFeatured: true, isDeal: false, totalSold: 1100, rating: 4.5 },
  { handle: 'fairy-dishwashing-750ml', nameEn: 'Fairy Dishwashing Liquid', nameAr: 'فيري غسيل أطباق', brandEn: 'Fairy', brandAr: 'فيري', weight: '750 ml', unit: 'piece', categorySlug: 'cleaning', todayPrice: 2800, yesterdayPrice: 3000, wholesalePrice: 2400, stock: 400, isFeatured: false, isDeal: true, totalSold: 1300, rating: 4.4 },
  { handle: 'clorox-bleach-1l', nameEn: 'Clorox Bleach', nameAr: 'كلوروكس', brandEn: 'Clorox', brandAr: 'كلوروكس', weight: '1 L', unit: 'piece', categorySlug: 'cleaning', todayPrice: 1500, yesterdayPrice: null, wholesalePrice: 1200, stock: 500, isFeatured: false, isDeal: false, totalSold: 900, rating: 4.2 },
  { handle: 'harpic-toilet-750ml', nameEn: 'Harpic Toilet Cleaner', nameAr: 'هاربيك منظف المرحاض', brandEn: 'Harpic', brandAr: 'هاربيك', weight: '750 ml', unit: 'piece', categorySlug: 'cleaning', todayPrice: 2200, yesterdayPrice: null, wholesalePrice: 1800, stock: 350, isFeatured: false, isDeal: false, totalSold: 750, rating: 4.3 },
  { handle: 'ariel-detergent-1kg', nameEn: 'Ariel Detergent Powder', nameAr: 'أريال مسحوق غسيل', brandEn: 'Ariel', brandAr: 'أريال', weight: '1 kg', unit: 'piece', categorySlug: 'cleaning', todayPrice: 4000, yesterdayPrice: 4200, wholesalePrice: 3500, stock: 250, isFeatured: false, isDeal: true, totalSold: 650, rating: 4.5 },
];

// ============================================
// SEED DATA — Delivery Zones
// ============================================

const DELIVERY_ZONES = [
  { nameEn: 'Nasr City', nameAr: 'مدينة نصر', area: 'Nasr City', city: 'Cairo', deliveryFee: 2500, minOrder: 20000, estimatedHours: 24, sortOrder: 1 },
  { nameEn: 'Maadi', nameAr: 'المعادي', area: 'Maadi', city: 'Cairo', deliveryFee: 2500, minOrder: 20000, estimatedHours: 24, sortOrder: 2 },
  { nameEn: 'Heliopolis', nameAr: 'مصر الجديدة', area: 'Heliopolis', city: 'Cairo', deliveryFee: 2500, minOrder: 20000, estimatedHours: 24, sortOrder: 3 },
  { nameEn: 'Zamalek', nameAr: 'الزمالك', area: 'Zamalek', city: 'Cairo', deliveryFee: 3000, minOrder: 25000, estimatedHours: 24, sortOrder: 4 },
  { nameEn: 'Dokki & Mohandessin', nameAr: 'الدقي والمهندسين', area: 'Dokki', city: 'Cairo', deliveryFee: 2500, minOrder: 20000, estimatedHours: 24, sortOrder: 5 },
  { nameEn: 'Shoubra', nameAr: 'شبرا', area: 'Shoubra', city: 'Cairo', deliveryFee: 2000, minOrder: 15000, estimatedHours: 24, sortOrder: 6 },
  { nameEn: '6th October City', nameAr: 'مدينة 6 أكتوبر', area: '6th October', city: 'Giza', deliveryFee: 4000, minOrder: 30000, estimatedHours: 48, sortOrder: 7 },
  { nameEn: 'Sheikh Zayed', nameAr: 'الشيخ زايد', area: 'Sheikh Zayed', city: 'Giza', deliveryFee: 3500, minOrder: 25000, estimatedHours: 48, sortOrder: 8 },
  { nameEn: 'Rehab City', nameAr: 'مدينة الرحاب', area: 'Rehab', city: 'Cairo', deliveryFee: 3000, minOrder: 20000, estimatedHours: 24, sortOrder: 9 },
  { nameEn: 'Madinti', nameAr: 'مدينتي', area: 'Madinti', city: 'Cairo', deliveryFee: 3000, minOrder: 20000, estimatedHours: 24, sortOrder: 10 },
];

export async function POST(_request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seeding disabled in production' }, { status: 403 });
  }

  try {
    // Seed Categories
    const categoryMap: Record<string, string> = {};

    for (const cat of CATEGORIES) {
      const created = await db.category.upsert({
        where: { slug: cat.slug },
        update: {
          nameEn: cat.nameEn,
          nameAr: cat.nameAr,
          icon: cat.icon,
          color: cat.color,
          sortOrder: cat.sortOrder,
          isActive: true,
          deletedAt: null,
        },
        create: {
          slug: cat.slug,
          nameEn: cat.nameEn,
          nameAr: cat.nameAr,
          icon: cat.icon,
          color: cat.color,
          sortOrder: cat.sortOrder,
          isActive: true,
        },
      });
      categoryMap[cat.slug] = created.id;
    }

    // Seed Products
    let productsCreated = 0;
    let productsUpdated = 0;

    for (const prod of PRODUCTS) {
      const categoryId = categoryMap[prod.categorySlug];
      if (!categoryId) continue;

      const existing = await db.product.findUnique({
        where: { handle: prod.handle },
      });

      if (existing) {
        await db.product.update({
          where: { handle: prod.handle },
          data: {
            nameEn: prod.nameEn,
            nameAr: prod.nameAr,
            brandEn: prod.brandEn,
            brandAr: prod.brandAr,
            weight: prod.weight,
            unit: prod.unit,
            categoryId,
            todayPrice: prod.todayPrice,
            yesterdayPrice: prod.yesterdayPrice,
            wholesalePrice: prod.wholesalePrice,
            stock: prod.stock,
            isFeatured: prod.isFeatured,
            isDeal: prod.isDeal,
            totalSold: prod.totalSold,
            rating: prod.rating,
            icon: CATEGORY_ICONS[prod.categorySlug] || '',
            isActive: true,
            deletedAt: null,
          },
        });
        productsUpdated++;
      } else {
        await db.product.create({
          data: {
            handle: prod.handle,
            nameEn: prod.nameEn,
            nameAr: prod.nameAr,
            brandEn: prod.brandEn,
            brandAr: prod.brandAr,
            weight: prod.weight,
            unit: prod.unit,
            categoryId,
            todayPrice: prod.todayPrice,
            yesterdayPrice: prod.yesterdayPrice,
            wholesalePrice: prod.wholesalePrice,
            stock: prod.stock,
            isFeatured: prod.isFeatured,
            isDeal: prod.isDeal,
            totalSold: prod.totalSold,
            rating: prod.rating,
            icon: CATEGORY_ICONS[prod.categorySlug] || '',
            maxPerOrder: 10,
            minOrderQty: 1,
            lowStockThreshold: 5,
            isActive: true,
          },
        });
        productsCreated++;
      }
    }

    // Seed Deals for products marked as deals
    const dealProducts = PRODUCTS.filter((p) => p.isDeal);
    let dealsCreated = 0;

    for (const prod of dealProducts) {
      const product = await db.product.findUnique({
        where: { handle: prod.handle },
      });
      if (!product) continue;

      const originalPrice = prod.yesterdayPrice ?? Math.round(prod.todayPrice * 1.15);
      const discountPercent = Math.round(((originalPrice - prod.todayPrice) / originalPrice) * 100);

      // Check if deal already exists
      const existingDeal = await db.deal.findFirst({
        where: { productId: product.id, isActive: true },
      });

      if (existingDeal) {
        await db.deal.update({
          where: { id: existingDeal.id },
          data: {
            dealPrice: prod.todayPrice,
            originalPrice,
            discountPercent,
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          },
        });
      } else {
        await db.deal.create({
          data: {
            productId: product.id,
            dealPrice: prod.todayPrice,
            originalPrice,
            discountPercent,
            startsAt: new Date(),
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            maxQuantity: 100,
            claimedCount: Math.floor(Math.random() * 30),
            isActive: true,
          },
        });
        dealsCreated++;
      }
    }

    // Seed Delivery Zones
    let zonesCreated = 0;

    for (const zone of DELIVERY_ZONES) {
      const existing = await db.deliveryZone.findFirst({
        where: { area: zone.area, city: zone.city },
      });

      if (existing) {
        await db.deliveryZone.update({
          where: { id: existing.id },
          data: {
            nameEn: zone.nameEn,
            nameAr: zone.nameAr,
            deliveryFee: zone.deliveryFee,
            minOrder: zone.minOrder,
            estimatedHours: zone.estimatedHours,
            sortOrder: zone.sortOrder,
            isActive: true,
          },
        });
      } else {
        await db.deliveryZone.create({
          data: {
            nameEn: zone.nameEn,
            nameAr: zone.nameAr,
            area: zone.area,
            city: zone.city,
            deliveryFee: zone.deliveryFee,
            minOrder: zone.minOrder,
            estimatedHours: zone.estimatedHours,
            sortOrder: zone.sortOrder,
            isActive: true,
          },
        });
        zonesCreated++;
      }
    }

    return successResponse({
      categories: CATEGORIES.length,
      productsCreated,
      productsUpdated,
      totalProducts: PRODUCTS.length,
      dealsCreated,
      zonesCreated,
    }, 'Database seeded successfully');
  } catch (err) {
    console.error('Seed error:', err);
    return errorResponse('Failed to seed database', 'SEED_FAILED', 500);
  }
}
