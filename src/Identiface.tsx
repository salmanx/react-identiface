import * as React from "react";
import { generateIdentifaceData } from "./generateIdentifaceData";

export type IdentifaceShape = "square" | "circle" | "triangle" | "diamond";

export interface IdentifaceProps {
  /** Any string - email, username, user id, etc. Same identifier = same avatar. */
  identifier: string;
  /** Rendered width & height in px. Default 200. */
  size?: number;
  /** Background fill behind the grid. Default white. */
  background?: string;
  /** Outer silhouette of the avatar. Default 'square'. */
  shape?: IdentifaceShape;
  className?: string;
  style?: React.CSSProperties;
  /** Optional custom accessible label; defaults to  identifier. */
  ariaLabel?: string;
}

const CLIP_POLYGONS: Partial<Record<IdentifaceShape, string>> = {
  triangle: "50,2 98,98 2,98",
  diamond: "50,0 100,50 50,100 0,50",
};

/**
 * Deterministic, GitHub-identicon-style avatar rendered as inline SVG.
 *
 * - Fully synchronous: no `useEffect`, no loading state, no async hashing.
 *   The SVG markup is complete on the very first render, which means it
 *   renders correctly during SSR (Next.js, Remix, etc.) with no
 *   hydration flash.
 * - No Web Crypto dependency, so it behaves identically across Node SSR,
 *   edge runtimes, and the browser.
 */
export function Identiface({
  identifier,
  size = 100,
  background = "#ffffff",
  shape = "square",
  className,
  style,
  ariaLabel,
}: IdentifaceProps) {
  const reactId = React.useId();
  const clipId = `Identiface-clip-${reactId}`;

  const { foreground, cells, gridSize } = React.useMemo(
    () => generateIdentifaceData(identifier),
    [identifier],
  );

  const cellSize = 100 / gridSize; // viewBox is a fixed 0-100 unit square
  const clipPolygon = CLIP_POLYGONS[shape];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role="img"
      aria-label={ariaLabel ?? `Avatar for ${identifier}`}
    >
      {shape !== "square" && (
        <clipPath id={clipId}>
          {shape === "circle" ? (
            <circle cx="50" cy="50" r="50" />
          ) : (
            <polygon points={clipPolygon} />
          )}
        </clipPath>
      )}
      <g clipPath={shape !== "square" ? `url(#${clipId})` : undefined}>
        <rect x={0} y={0} width={100} height={100} fill={background} />
        {cells.map(({ row, col }) => (
          <rect
            key={`${row}-${col}`}
            x={col * cellSize}
            y={row * cellSize}
            width={cellSize}
            height={cellSize}
            fill={foreground}
          />
        ))}
      </g>
    </svg>
  );
}
