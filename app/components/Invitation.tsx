"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./invitation.module.css";
import { WEDDING } from "../wedding-details";

/* ------------------------------------------------------------------ */
/*  Edit your wedding details here                                     */
/* ------------------------------------------------------------------ */
/*  Your details now live in app/wedding-details.ts                    */

/* Opening sequence timings (ms) */
const T_OPEN = 380;
const T_PETALS = 900;
const T_REVEAL = 3900;

type Stage = 0 | 1 | 2 | 3 | 4;

const cx = (...c: Array<string | false | null | undefined>) =>
  c.filter(Boolean).join(" ");
const vars = (o: Record<string, string | number>) => o as CSSProperties;

/* ------------------------------------------------------------------ */
/*  Gatefold geometry (viewBox 820 × 1600, scaled with "slice")        */
/* ------------------------------------------------------------------ */
const VB_W = 820;
const VB_H = 1600;
const MIRROR = `translate(${VB_W} 0) scale(-1 1)`;

type Pt = [number, number];
/** Left panel edge: top → centre tip → bottom (right panel is mirrored). */
const EDGE: Pt[] = [
  [95, -60],
  [404, 800],
  [65, 1660],
];

/** Scalloped line along a polyline. `offset` moves it inward (towards −x). */
function scallopEdge(points: Pt[], size: number, offset: number) {
  let d = "";
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    let nx = -uy;
    let ny = ux;
    if (nx > 0) {
      nx = -nx;
      ny = -ny;
    }
    const ax = x1 + nx * offset;
    const ay = y1 + ny * offset;
    const n = Math.max(1, Math.round(len / size));
    const step = len / n;
    const sweep = -nx * uy + ny * ux > 0 ? 1 : 0;
    d += `${i === 0 && offset ? "M" : " L"}${ax.toFixed(1)} ${ay.toFixed(1)}`;
    for (let k = 1; k <= n; k++) {
      const px = ax + ux * step * k;
      const py = ay + uy * step * k;
      d += ` A${(step / 2).toFixed(2)} ${(step / 2).toFixed(2)} 0 0 ${sweep} ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
  }
  return d;
}

const SCALLOP = 46;
const PANEL_PATH = `M-120 -60${scallopEdge(EDGE, SCALLOP, 0)} L-120 1660 Z`;
const STITCH_PATH = scallopEdge(EDGE, SCALLOP, 28);

/** Where the embossed sprigs sit on the left panel: x, y, scale, rotation. */
const PANEL_SPRIGS: Array<[number, number, number, number]> = [
  [-40, 20, 1.35, 6],
  [100, 330, 1.25, -8],
  [-60, 520, 1.5, 4],
  [150, 650, 1.05, 12],
  [-40, 930, 1.45, -6],
  [90, 1150, 1.2, -16],
  [-70, 1330, 1.4, 8],
];

/* ------------------------------------------------------------------ */
/*  Seal outline + decorative particles                                */
/* ------------------------------------------------------------------ */
const SEAL_PATH = (() => {
  const pts: string[] = [];
  const n = 120;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = 44 + 2.8 * Math.sin(t * 6 + 0.3) + 1.1 * Math.sin(t * 13 + 1.1);
    pts.push(`${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join(" L")}Z`;
})();

const SPARKS = Array.from({ length: 18 }, (_, i) => ({
  a: i * 20 + ((i * 7) % 9),
  r: 80 + ((i * 37) % 90),
  s: 6 + ((i * 5) % 9),
  d: (i % 4) * 0.04,
}));

/* Tiny gold motes that drift upward over the closed card. */
const DUST = Array.from({ length: 16 }, (_, i) => ({
  x: `${((i * 37 + 11) % 96) + 2}%`,
  y: `${((i * 53 + 17) % 90) + 5}%`,
  s: 2 + ((i * 3) % 3),
  t: 7 + ((i * 5) % 6),
  d: -Number(((i * 1.3) % 9).toFixed(1)),
}));

const PETAL_COLORS = [
  ["#f3dca5", "#c99a4f"],
  ["#b4495a", "#7a2232"],
  ["#f8ead0", "#d9b77a"],
  ["#9c3546", "#5e1622"],
];

const PETALS = Array.from({ length: 26 }, (_, i) => {
  const [c1, c2] = PETAL_COLORS[i % PETAL_COLORS.length];
  return {
    x: `${(i * 41) % 100}%`,
    s: 9 + ((i * 7) % 11),
    t: 6 + ((i * 13) % 5),
    d: ((i * 0.37) % 3.4).toFixed(2),
    dx: `${(i % 2 ? 1 : -1) * (30 + ((i * 23) % 90))}px`,
    c1,
    c2,
  };
});

/* ------------------------------------------------------------------ */

export default function Invitation() {
  const [stage, setStage] = useState<Stage>(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const open = () => {
    if (stage !== 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage(4);
      return;
    }
    setStage(1);
    later(() => setStage(2), T_OPEN);
    later(() => setStage(3), T_PETALS);
    later(() => setStage(4), T_REVEAL);
  };

  const replay = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setStage(0);
  };

  return (
    <main className={styles.scene}>
      <SharedDefs />

      <div
        className={cx(
          styles.stage,
          stage >= 1 && styles.sealBroken,
          stage >= 2 && styles.opened,
          stage >= 4 && styles.revealed,
        )}
        aria-hidden={stage >= 4}
      >
        <button
          type="button"
          className={styles.gate}
          onClick={open}
          disabled={stage > 0}
          aria-label="Open the wedding invitation"
        >
          {/* Inner card behind the panels */}
          <span className={styles.base}>
            <BasePaper />
          </span>

          <span className={styles.inner}>
            <span className={styles.innerKicker}>Together with their families</span>
            <span className={styles.innerMono}>
              {WEDDING.firstName}
              <span className={styles.innerAmp}>&amp;</span>
              {WEDDING.secondName}
            </span>
            <span className={styles.innerSub}>are getting married</span>
            <span className={styles.innerDate}>{WEDDING.shortDate}</span>
          </span>

          {/* Folding lace panels */}
          <span className={cx(styles.flap, styles.flapL)}>
            <Panel id="pl" />
          </span>
          <span className={cx(styles.flap, styles.flapR)}>
            <Panel id="pr" mirrored />
          </span>

          <span className={styles.light} />
          <span className={styles.grain} />

          {/* Gold dust drifting over the card */}
          <span className={styles.dust} aria-hidden="true">
            {DUST.map((d, i) => (
              <span
                key={i}
                style={vars({
                  "--x": d.x,
                  "--y": d.y,
                  "--sz": `${d.s}px`,
                  "--t": `${d.t}s`,
                  "--dl": `${d.d}s`,
                })}
              />
            ))}
          </span>

          {/* Gold wax seal */}
          <span className={styles.seal}>
            <span className={styles.sealGlow} />
            <span className={styles.sealBody}>
              <span className={cx(styles.half, styles.halfL)}>
                <GoldSeal id="seal-l" />
              </span>
              <span className={cx(styles.half, styles.halfR)}>
                <GoldSeal id="seal-r" />
              </span>
              <span className={styles.glint} />
            </span>
          </span>

          <span className={styles.burst} aria-hidden="true">
            {SPARKS.map((s, i) => (
              <span
                key={i}
                className={styles.spark}
                style={vars({
                  "--a": `${s.a}deg`,
                  "--r": `${s.r}px`,
                  "--sz": `${s.s}px`,
                  "--dl": `${s.d}s`,
                })}
              />
            ))}
          </span>

          <span className={styles.hint}>
            <span>Tap the seal to open</span>
          </span>
        </button>
      </div>

      {stage >= 3 && (
        <div className={styles.petals} aria-hidden="true">
          {PETALS.map((p, i) => (
            <span
              key={i}
              className={styles.petal}
              style={vars({
                "--x": p.x,
                "--s": `${p.s}px`,
                "--t": `${p.t}s`,
                "--dl": `${p.d}s`,
                "--dx": p.dx,
                "--c1": p.c1,
                "--c2": p.c2,
              })}
            />
          ))}
        </div>
      )}

      {stage >= 3 && (
        <div className={cx(styles.overlay, stage >= 4 && styles.overlayShown)}>
          <InvitationCard active={stage >= 4} onReplay={replay} />
        </div>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared SVG defs: embossed floral sprig + emboss lighting filter    */
/* ------------------------------------------------------------------ */
const PETAL = "M0 0 C -10 -4 -14 -18 -6 -26 C -3 -29 3 -29 6 -26 C 14 -18 10 -4 0 0Z";
const LEAF = "M0 0 C 5 -6 6 -16 0 -25 C -6 -16 -5 -6 0 0Z";
const BUD = "M0 0 C -6 -4 -7 -14 0 -21 C 7 -14 6 -4 0 0Z";
/** Raised floral colour (slightly lighter than the paper) and its pressed lines. */
const EMBOSS = "#74303a";
const VEIN = "#4a151c";

function Flower({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 60, 120, 180, 240, 300].map((r) => (
        <g key={r} transform={`rotate(${r})`}>
          <path d={PETAL} />
          <path d="M0 -6 L0 -19" fill="none" stroke={VEIN} strokeWidth={1.1} />
        </g>
      ))}
      {[30, 90, 150, 210, 270, 330].map((r) => (
        <g key={r} transform={`rotate(${r}) scale(0.58)`}>
          <path d={PETAL} />
        </g>
      ))}
      <circle r={6.5} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <circle
            key={i}
            cx={(Math.cos(a) * 9.5).toFixed(2)}
            cy={(Math.sin(a) * 9.5).toFixed(2)}
            r={1.1}
          />
        );
      })}
    </g>
  );
}

function SharedDefs() {
  const leaves: Array<[number, number, number]> = [
    [58, 238, -52],
    [66, 208, 56],
    [54, 172, -58],
    [68, 142, 50],
    [52, 106, -55],
    [64, 84, 48],
    [40, 186, -20],
    [80, 108, 30],
  ];
  return (
    <svg className={styles.defs} aria-hidden="true" focusable="false">
      <defs>
        <filter id="rs-emboss" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="blur" />
          <feSpecularLighting
            in="blur"
            surfaceScale="3"
            specularConstant="0.55"
            specularExponent="18"
            lightingColor="#ffc7c7"
            result="spec"
          >
            <feDistantLight azimuth="225" elevation="38" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
          <feOffset in="SourceAlpha" dx="1.6" dy="2.2" result="off" />
          <feGaussianBlur in="off" stdDeviation="1.6" result="offBlur" />
          <feFlood floodColor="#1c0408" floodOpacity="0.6" />
          <feComposite in2="offBlur" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="specIn" />
          </feMerge>
        </filter>

        {/* Crisp pressed-paper emboss for the closed card: light on the
            top-left edges, shade on the bottom-right. */}
        <filter
          id="rs-emboss-press"
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
          colorInterpolationFilters="sRGB"
        >
          <feOffset in="SourceAlpha" dx="2" dy="2.6" result="dropOff" />
          <feGaussianBlur in="dropOff" stdDeviation="2.2" result="dropBlur" />
          <feFlood floodColor="#180206" floodOpacity="0.45" />
          <feComposite in2="dropBlur" operator="in" result="drop" />
          <feOffset in="SourceAlpha" dx="2.2" dy="2.2" result="hiOff" />
          <feComposite in="SourceAlpha" in2="hiOff" operator="out" result="hiEdge" />
          <feGaussianBlur in="hiEdge" stdDeviation="0.7" result="hiBlur" />
          <feFlood floodColor="#e7a6ad" floodOpacity="0.5" />
          <feComposite in2="hiBlur" operator="in" result="hi" />
          <feOffset in="SourceAlpha" dx="-2.2" dy="-2.2" result="shOff" />
          <feComposite in="SourceAlpha" in2="shOff" operator="out" result="shEdge" />
          <feGaussianBlur in="shEdge" stdDeviation="0.8" result="shBlur" />
          <feFlood floodColor="#1f0409" floodOpacity="0.55" />
          <feComposite in2="shBlur" operator="in" result="sh" />
          <feMerge>
            <feMergeNode in="drop" />
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="sh" />
            <feMergeNode in="hi" />
          </feMerge>
        </filter>

        {/* Gold foil for the trim along the lace edges */}
        <linearGradient id="rs-foil" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#8f6526" />
          <stop offset="0.2" stopColor="#f3dca5" />
          <stop offset="0.38" stopColor="#b98a3e" />
          <stop offset="0.5" stopColor="#fff1cc" />
          <stop offset="0.62" stopColor="#c99a4f" />
          <stop offset="0.8" stopColor="#f0d79f" />
          <stop offset="1" stopColor="#8f6526" />
        </linearGradient>

        <linearGradient id="rs-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6c2730" />
          <stop offset="1" stopColor="#561c24" />
        </linearGradient>
        <radialGradient id="rs-base" cx="50%" cy="45%" r="75%">
          <stop offset="0" stopColor="#5d2028" />
          <stop offset="1" stopColor="#44141a" />
        </radialGradient>

        <symbol id="rs-sprig" viewBox="0 0 120 260" overflow="visible">
          <g fill={EMBOSS}>
            <g fill="none" stroke={EMBOSS} strokeWidth={2.6} strokeLinecap="round">
              <path d="M62 258 C 44 222, 80 190, 58 150 S 48 92, 62 58" />
              <path d="M56 196 C 42 190, 32 180, 27 166" />
              <path d="M66 122 C 80 114, 90 102, 94 88" />
              <path d="M60 224 C 76 224, 90 216, 96 204" />
            </g>
            {leaves.map(([x, y, r], i) => (
              <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
                <path d={LEAF} />
                <path d="M0 -3 L0 -20" fill="none" stroke={VEIN} strokeWidth={1} />
              </g>
            ))}
            <g transform="translate(27 168) rotate(-40)">
              <path d={BUD} />
            </g>
            <g transform="translate(94 90) rotate(34)">
              <path d={BUD} />
            </g>
            <Flower x={62} y={46} s={1.3} />
            <Flower x={99} y={198} s={0.7} />
          </g>
        </symbol>
      </defs>
    </svg>
  );
}

function Sprig({
  x,
  y,
  s,
  r,
}: {
  x: number;
  y: number;
  s: number;
  r: number;
}) {
  return (
    <use
      href="#rs-sprig"
      width={120}
      height={260}
      transform={`translate(${x} ${y}) rotate(${r} ${60 * s} ${130 * s}) scale(${s})`}
    />
  );
}

function Panel({ id, mirrored = false }: { id: string; mirrored?: boolean }) {
  const flip = mirrored ? MIRROR : undefined;
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={PANEL_PATH} transform={flip} />
        </clipPath>
      </defs>
      <g transform={flip}>
        <path d={PANEL_PATH} fill="url(#rs-panel)" />
      </g>
      <g clipPath={`url(#${id}-clip)`} filter="url(#rs-emboss-press)">
        <g transform={flip}>
          {PANEL_SPRIGS.map(([x, y, s, r], i) => (
            <Sprig key={i} x={x} y={y} s={s} r={r} />
          ))}
        </g>
      </g>
      <g transform={flip}>
        <path className={styles.stitch} d={STITCH_PATH} />
        <path className={styles.stitchHi} d={STITCH_PATH} />
        <path className={styles.edgeShadow} d={scallopEdgeOnly} />
        <path className={styles.edgeLine} d={scallopEdgeOnly} stroke="url(#rs-foil)" />
      </g>
    </svg>
  );
}

const scallopEdgeOnly = `M95 -60${scallopEdge(EDGE, SCALLOP, 0)}`;

function BasePaper() {
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect x={-200} y={-100} width={VB_W + 400} height={VB_H + 200} fill="url(#rs-base)" />
      <g filter="url(#rs-emboss-press)" className={styles.baseFlorals}>
        <Sprig x={290} y={-40} s={1.0} r={180} />
        <Sprig x={360} y={-20} s={0.8} r={160} />
        <Sprig x={300} y={1370} s={1.0} r={0} />
        <Sprig x={360} y={1400} s={0.8} r={22} />
      </g>
    </svg>
  );
}

/* Gold wax seal with an embossed R & S monogram. */
function GoldSeal({ id }: { id: string }) {
  const letters = (
    <>
      <text x={37} y={59.5} fontSize={27}>
        {WEDDING.first}
      </text>
      <text x={50} y={57} fontSize={11}>
        &amp;
      </text>
      <text x={63} y={59.5} fontSize={27}>
        {WEDDING.second}
      </text>
    </>
  );
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-wax`} cx="34%" cy="28%" r="85%">
          <stop offset="0" stopColor="#fff2cc" />
          <stop offset="0.28" stopColor="#ecca82" />
          <stop offset="0.62" stopColor="#c6964a" />
          <stop offset="1" stopColor="#80591e" />
        </radialGradient>
        {/* recessed centre: darker where the rim shades it (top-left) */}
        <radialGradient id={`${id}-dish`} cx="62%" cy="66%" r="78%">
          <stop offset="0" stopColor="#e9c67c" />
          <stop offset="0.55" stopColor="#d1a75b" />
          <stop offset="1" stopColor="#9c6f2c" />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0.15" y1="0.1" x2="0.85" y2="0.9">
          <stop offset="0" stopColor="#6b4512" />
          <stop offset="0.5" stopColor="#b48743" />
          <stop offset="1" stopColor="#fff0c4" />
        </linearGradient>
        <linearGradient id={`${id}-letter`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6dc9c" />
          <stop offset="1" stopColor="#b98a3f" />
        </linearGradient>
        {/* rounded, poured-wax volume */}
        <filter id={`${id}-vol`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.6" result="b" />
          <feSpecularLighting
            in="b"
            surfaceScale="5"
            specularConstant="0.9"
            specularExponent="24"
            lightingColor="#fff6dc"
            result="s"
          >
            <feDistantLight azimuth="225" elevation="50" />
          </feSpecularLighting>
          <feComposite in="s" in2="SourceAlpha" operator="in" result="si" />
          <feDiffuseLighting in="b" surfaceScale="5" diffuseConstant="1.15" lightingColor="#ffffff" result="d">
            <feDistantLight azimuth="225" elevation="58" />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1" result="lit" />
          <feComposite in="lit" in2="si" operator="arithmetic" k2="1" k3="0.75" result="shine" />
          <feComposite in="shine" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>

      <path d={SEAL_PATH} fill={`url(#${id}-wax)`} filter={`url(#${id}-vol)`} />
      <circle cx={50} cy={50} r={32.5} fill={`url(#${id}-dish)`} />
      <circle cx={50} cy={50} r={32.4} fill="none" stroke={`url(#${id}-rim)`} strokeWidth={1.8} />
      <circle
        cx={50}
        cy={50}
        r={28.4}
        fill="none"
        stroke="#7a5418"
        strokeOpacity={0.4}
        strokeWidth={0.55}
        strokeDasharray="0.9 1.6"
      />

      <g
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-serif), Georgia, serif",
          fontStyle: "italic",
          fontWeight: 600,
        }}
      >
        <g transform="translate(0.6 0.8)" fill="#5a3a0c" fillOpacity={0.75}>
          {letters}
        </g>
        <g transform="translate(-0.45 -0.45)" fill="#fff7dc" fillOpacity={0.85}>
          {letters}
        </g>
        <g fill={`url(#${id}-letter)`}>{letters}</g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Full invitation (after opening)                                    */
/* ------------------------------------------------------------------ */
function InvitationCard({
  active,
  onReplay,
}: {
  active: boolean;
  onReplay: () => void;
}) {
  return (
    <div className={cx(styles.invite, active && styles.inviteShown)}>
      <article className={styles.paper}>
        <CornerSprig className={styles.cornerTL} />
        <CornerSprig className={styles.cornerTR} />
        <CornerSprig className={styles.cornerBL} />
        <CornerSprig className={styles.cornerBR} />

        <div className={styles.paperBody}>
          <Reveal active={active} delay={0.45}>
            <Ornament />
          </Reveal>

          <Reveal active={active} delay={0.6}>
            <p className={styles.small}>Together with their families</p>
          </Reveal>

          <Reveal active={active} delay={0.75}>
            <h2
              className={styles.monogram}
              aria-label={`${WEDDING.first} and ${WEDDING.second}`}
            >
              <span className={styles.innerMono}>{WEDDING.firstName}</span>
              <span className={styles.amp}>&amp;</span>
              <span className={styles.innerMono}>{WEDDING.secondName}</span>
            </h2>
          </Reveal>

          <Reveal active={active} delay={0.9}>
            <p className={styles.lead}>
              request the honour of your presence
              <br />
              as they begin their forever together
            </p>
          </Reveal>

          <Reveal active={active} delay={1.05}>
            <Divider />
            <div className={styles.dateRow}>
              <span className={styles.dateSide}>{WEDDING.weekday}</span>
              <span className={styles.dateMid}>
                <span className={styles.month}>{WEDDING.month}</span>
                <span className={styles.day}>{WEDDING.day}</span>
              </span>
              <span className={styles.dateSide}>{WEDDING.year}</span>
            </div>
            <p className={styles.time}>{WEDDING.time}</p>
          </Reveal>

          <Reveal active={active} className={styles.section}>
            <p className={styles.small}>Venue</p>
            <h3 className={styles.venue}>{WEDDING.venue}</h3>
            <p className={styles.address}>{WEDDING.address}</p>
            {WEDDING.mapLink && (
              <div className={styles.btnRow}>
                <a
                  className={styles.btn}
                  href={WEDDING.mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Directions
                </a>
              </div>
            )}
          </Reveal>

          <Reveal active={active} className={styles.section}>
            <p className={styles.note}>Dinner &amp; dancing to follow</p>
          </Reveal>

          <Reveal active={active} className={styles.section}>
            <Divider />
            <p className={styles.small}>Counting down</p>
            <Countdown target={WEDDING.startsAt} />
          </Reveal>

          <Reveal active={active}>
            <Ornament flipped />
          </Reveal>
        </div>
      </article>

      <button type="button" className={styles.replay} onClick={onReplay}>
        &#8634;&nbsp; Open the invitation again
      </button>
    </div>
  );
}

function CornerSprig({ className }: { className: string }) {
  return (
    <svg
      className={cx(styles.corner, className)}
      viewBox="0 0 120 260"
      aria-hidden="true"
    >
      <g filter="url(#rs-emboss)">
        <use href="#rs-sprig" width={120} height={260} />
      </g>
    </svg>
  );
}

/* Fades/slides its children in when scrolled into view. */
function Reveal({
  active,
  delay = 0,
  className,
  children,
}: {
  active: boolean;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!active || !el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -5% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [active, inView]);

  return (
    <div
      ref={ref}
      className={cx(styles.reveal, inView && styles.in, className)}
      style={vars({ "--d": `${delay}s` })}
    >
      {children}
    </div>
  );
}

function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const diff = Math.max(0, new Date(target).getTime() - now);
  if (diff === 0) {
    return <p className={styles.note}>Today is the day!</p>;
  }

  const units: Array<[string, number]> = [
    ["Days", Math.floor(diff / 86_400_000)],
    ["Hours", Math.floor(diff / 3_600_000) % 24],
    ["Minutes", Math.floor(diff / 60_000) % 60],
    ["Seconds", Math.floor(diff / 1000) % 60],
  ];

  return (
    <div className={styles.countdown} role="timer">
      {units.map(([label, value]) => (
        <div key={label} className={styles.unit}>
          <span key={value} className={styles.num}>
            {String(value).padStart(2, "0")}
          </span>
          <span className={styles.lbl}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function Divider() {
  return (
    <div className={styles.divider} aria-hidden="true">
      <span />
      <i />
      <span />
    </div>
  );
}

/* Gold botanical ornament that draws itself in. */
const ORN_LEAVES: Array<[number, number, number]> = [
  [106, 32.5, -145],
  [98, 31.5, 150],
  [88, 30, -150],
  [78, 29, 155],
  [67, 28, -155],
  [57, 27.6, 152],
  [46, 27.6, -160],
  [36, 28.2, 160],
  [18, 30, 180],
];
const ORN_LEAF = "M0 0 C4 -5 11 -5.5 15 0 C11 5.5 4 5 0 0Z";

function Branch() {
  return (
    <g>
      <path
        className={styles.stem}
        pathLength={1}
        d="M114 33.5 C 96 31, 70 25, 18 30"
      />
      {ORN_LEAVES.map(([x, y, a], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
          <path
            className={styles.leaf}
            d={ORN_LEAF}
            fill={i % 2 ? "var(--gold-light)" : "var(--gold)"}
            style={vars({ "--i": i })}
          />
        </g>
      ))}
      {[
        [92, 22.5],
        [62, 19.5],
        [72, 37],
        [40, 37.5],
      ].map(([x, y], i) => (
        <circle
          key={i}
          className={styles.berry}
          cx={x}
          cy={y}
          r={1.9}
          fill="var(--cream)"
          style={vars({ "--i": i })}
        />
      ))}
    </g>
  );
}

function Ornament({ flipped = false }: { flipped?: boolean }) {
  return (
    <svg
      className={cx(styles.ornament, flipped && styles.flipped)}
      viewBox="0 0 240 60"
      aria-hidden="true"
    >
      <Branch />
      <g transform="translate(240 0) scale(-1 1)">
        <Branch />
      </g>
      <g className={styles.flower}>
        {[0, 60, 120, 180, 240, 300].map((r) => (
          <ellipse
            key={r}
            cx={120}
            cy={28.5}
            rx={2.2}
            ry={4.4}
            fill="var(--gold-light)"
            transform={`rotate(${r} 120 33)`}
          />
        ))}
        <circle cx={120} cy={33} r={2.4} fill="var(--gold)" />
      </g>
    </svg>
  );
}
