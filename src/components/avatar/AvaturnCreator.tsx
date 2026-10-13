"use client";

// Full-screen Avaturn editor: the citizen takes or uploads selfies, Avaturn builds a realistic
// 3D avatar, and pressing "Next" in Avaturn hands us the GLB.
// Uses Avaturn's free embed. Set NEXT_PUBLIC_AVATURN_SUBDOMAIN to your project's subdomain
// from developer.avaturn.me; it falls back to Avaturn's public "demo" project.

import { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { IDB_PREFIX, saveAvatarBlob } from "./customAvatarStore";
import type { Gender } from "./roster";

const SUBDOMAIN = process.env.NEXT_PUBLIC_AVATURN_SUBDOMAIN || "demo";

export interface CreatedAvatar {
  avatarId: string;
  url: string;
  gender: Gender;
}

export function AvaturnCreator({ onCreated, onClose }: { onCreated: (a: CreatedAvatar) => void; onClose: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let teardown: (() => void) | undefined;

    (async () => {
      try {
        const { AvaturnSDK } = await import("@avaturn/sdk");
        if (cancelled || !container.current) return;
        const sdk = new AvaturnSDK();
        await sdk.init(container.current, { url: `https://${SUBDOMAIN}.avaturn.dev`, iframeClassName: "w-full h-full border-0" });
        if (cancelled) return;
        setStatus("ready");

        sdk.on("export", async (data) => {
          setStatus("saving");
          try {
            let url = data.url;
            // Data URLs are multi-megabyte; keep the file in IndexedDB and store a reference.
            if (data.urlType === "dataURL") {
              const blob = await (await fetch(data.url)).blob();
              await saveAvatarBlob(data.avatarId, blob);
              url = `${IDB_PREFIX}${data.avatarId}`;
            }
            onCreated({ avatarId: data.avatarId, url, gender: data.gender === "male" ? "man" : "woman" });
          } catch {
            setStatus("error");
          }
        });
        teardown = () => sdk.destroy();
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [onCreated]);

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-6">
      <div className="relative w-full h-full sm:max-w-5xl sm:h-[90vh] bg-white sm:rounded-3xl overflow-hidden shadow-2xl">
        <div ref={container} className="absolute inset-x-0 bottom-0 top-10" />
        <div className="absolute inset-x-0 top-0 h-10 flex items-center justify-center gap-1.5 bg-amber-50 border-b border-amber-200 text-[11px] sm:text-xs font-bold text-amber-800 px-12 text-center">
          👗 Pick your outfit, hair, shoes and glasses here before tapping Next. You can&apos;t change them anywhere else.
        </div>

        {status !== "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white text-slate-700 text-sm font-bold text-center px-6">
            {status === "error" ? (
              <>
                <span>Couldn&apos;t open the selfie creator. Check your connection and try again.</span>
                <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-900 text-white">Close</button>
              </>
            ) : (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span>{status === "saving" ? "Saving your avatar…" : "Opening the selfie creator…"}</span>
              </>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="absolute top-0.5 right-1 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center text-slate-700"
          aria-label="Close selfie creator"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
