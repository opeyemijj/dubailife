// Development only: the cities strip under the top bar, laid out as on the map (the bar's frame, the strip, the
// Search and Passport chips at their places), without signing in. Production builds answer 404.
import { notFound } from "next/navigation";
import { CitySwitcher } from "@/components/city/CitySwitcher";
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="fixed inset-0 bg-[#d6bc8a]">
      <div className="fixed top-0 left-0 w-full z-50 px-3 sm:px-6 pt-[max(0.6rem,env(safe-area-inset-top))] pb-1.5 pointer-events-none">
        <div className="max-w-4xl mx-auto h-[46px] rounded-full bg-white/95 shadow" />
        <CitySwitcher />
      </div>
      <div className="absolute top-[max(7.9rem,calc(env(safe-area-inset-top)+7.3rem))] sm:top-[max(7.4rem,calc(env(safe-area-inset-top)+6.8rem))] left-3 sm:left-6 h-9 px-3.5 rounded-full bg-white flex items-center text-sm font-bold">🔍 Search</div>
      <div className="absolute top-[max(7.9rem,calc(env(safe-area-inset-top)+7.3rem))] sm:top-[max(7.4rem,calc(env(safe-area-inset-top)+6.8rem))] left-[7.25rem] sm:left-[8.25rem] h-9 px-3.5 rounded-full bg-teal-800 text-white flex items-center text-sm font-black">🛂 Passport 3/16</div>
    </main>
  );
}
