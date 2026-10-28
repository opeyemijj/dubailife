import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CarShop } from "@/components/cars/CarShop";
import CARS from "@/data/cars/cars.json";

const shopOf = (id: string) => {
  const r = CARS.rentals.find((x) => x.id === id);
  if (r) return { ...r, rent: true };
  const d = CARS.dealers.find((x) => x.id === id);
  return d ? { ...d, rent: false } : null;
};

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const shop = shopOf((await params).id);
  if (!shop) return { title: "Not found", robots: { index: false } };
  return { title: `${shop.name} · ${shop.rent ? "car rental" : "car showroom"}`, description: shop.blurb, robots: { index: false } };
}

export default async function Page({ params }: Params) {
  const { id } = await params;
  if (!shopOf(id)) notFound();
  return <CarShop id={id} />;
}
