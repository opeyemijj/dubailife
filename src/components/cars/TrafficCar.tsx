"use client";

// A car in the city's traffic (on the street and on the road): one of the game's real car models in its own paint
// and plate, a taxi in cream with its red roof sign (lib/city/traffic: trafficLooks).

import { useMemo } from "react";
import { carOf, type Car } from "@/lib/cars";
import type { TrafficLook } from "@/lib/city/traffic";
import { CarModel } from "./CarModel";

export function TrafficCar({ look }: { look: TrafficLook }) {
  const car = useMemo(() => {
    const c = carOf(look.id) as (Car & { model3d?: string }) | undefined;
    return c ? { ...c, color: look.color } : undefined;
  }, [look]);
  return (
    <group>
      {car && <CarModel car={car} plate={look.plate} />}
      {look.taxi && <mesh position={[0, 1.62, -0.2]}><boxGeometry args={[0.7, 0.22, 0.28]} /><meshStandardMaterial color="#dc2626" emissive="#7f1d1d" /></mesh>}
    </group>
  );
}
