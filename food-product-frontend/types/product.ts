export interface Nutrition {
  energyKcal: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  protein: number | null;
  salt: number | null;
}

export interface Product {
  id: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  nutrition: Nutrition | null;
  nutritionLocked: boolean;
}
