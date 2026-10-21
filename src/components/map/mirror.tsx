import React from 'react';

// Buildings on the map show their front and their RIGHT side, the way the ground recedes (plots, roads and
// floor tiles all lean back to the right). Drawings made with a left wall are mirrored round the middle of
// their front face with <MirrorX>; ground slabs and labels stay outside it. Lettering inside is flipped back
// by the .svg-mirror rule in globals.css, so signs still read the right way round.

export function MirrorX({ cx, children }: { cx: number; children: React.ReactNode }) {
  return <g className="svg-mirror" transform={`translate(${2 * cx} 0) scale(-1 1)`}>{children}</g>;
}
