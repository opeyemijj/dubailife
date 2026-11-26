// Development only: the cities strip under the top bar, laid out as on the map (the bar's frame, the strip, the
// Search and Passport chips at their places), without signing in. Production builds answer 404.
import { notFound } from "next/navigation";
import { CitySwitcher } from "@/components/city/CitySwitcher";
import { RailPreview } from "./RailPreview";
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="fixed inset-0 bg-[#d6bc8a]">
      <div className="fixed top-0 left-0 w-full z-50 px-3 sm:px-6 pt-[max(0.6rem,env(safe-area-inset-top))] pb-1.5 pointer-events-none">
        <div className="max-w-4xl mx-auto h-[46px] rounded-full bg-white/95 shadow" />
        <CitySwitcher />
      </div>
      <RailPreview />
      {/* Stand-in for the bottom menu (fixed, z-50, like BottomNav): the popups must cover it. */}
      <div id="fake-bottom-nav" className="fixed bottom-0 left-0 w-full z-50 px-3 pb-3"><div className="h-[60px] rounded-full bg-white shadow-xl" /></div>
    </main>
  );
}
