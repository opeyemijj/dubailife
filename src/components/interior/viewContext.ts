"use client";

// What the interior camera is doing, for scenery that depends on it: a dome or a ceiling overhead only in the
// first-person (eye) view, since from the usual view above the room a roof would hide everything.
import { createContext, useContext } from "react";

export const InteriorEye = createContext(false);
export const useInteriorEye = () => useContext(InteriorEye);
