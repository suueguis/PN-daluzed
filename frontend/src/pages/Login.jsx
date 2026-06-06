import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { loginAPI } from "../api/authAPI";
import useAuthStore from "../store/authStore";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Correo inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

// ─────────────────────────────────────────────────────────────────────────────
// Inline icon components  (strokeWidth 1.9, 16 × 16)
// ─────────────────────────────────────────────────────────────────────────────

const AtIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
  </svg>
);

const LockIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeOpenIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="animate-spin"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// BakeryIllustration
// viewBox 0 0 300 460 — maxWidth 270 px
// ─────────────────────────────────────────────────────────────────────────────

const BakeryIllustration = () => (
  <svg
    viewBox="0 0 300 460"
    style={{ maxWidth: "270px", width: "100%" }}
    aria-hidden="true"
  >
    {/* ── DECORATIVE STARS (6) ── */}
    {[
      [22, 32, "#C96870", 0.45],
      [278, 52, "#D4A882", 0.4],
      [14, 280, "#C96870", 0.38],
      [286, 300, "#D4A882", 0.42],
      [22, 418, "#C96870", 0.4],
      [278, 435, "#D4A882", 0.38],
    ].map(([tx, ty, fill, opacity], i) => (
      <g
        key={`star-${i}`}
        transform={`translate(${tx},${ty})`}
        fill={fill}
        opacity={opacity}
      >
        <path d="M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5 Z" />
      </g>
    ))}

    {/* ── DECORATIVE CIRCLES (6) ── */}
    {[
      [44, 88, 4, "#D4A882", 0.4],
      [256, 98, 3, "#C96870", 0.38],
      [16, 145, 4, "#D4A882", 0.45],
      [284, 130, 3, "#C96870", 0.38],
      [14, 350, 3, "#D4A882", 0.4],
      [286, 370, 4, "#C96870", 0.35],
    ].map(([cx, cy, r, fill, opacity], i) => (
      <circle
        key={`dot-${i}`}
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        opacity={opacity}
      />
    ))}

    {/* ── FLOWER 1 — translate(38,195) — dusty rose #D07888 ── */}
    <g transform="translate(38,195)">
      <ellipse
        cx="0"
        cy="-13"
        rx="6"
        ry="10"
        fill="#D07888"
        transform="rotate(0,0,0)"
      />
      <ellipse
        cx="0"
        cy="-13"
        rx="6"
        ry="10"
        fill="#D07888"
        transform="rotate(72,0,0)"
      />
      <ellipse
        cx="0"
        cy="-13"
        rx="6"
        ry="10"
        fill="#D07888"
        transform="rotate(144,0,0)"
      />
      <ellipse
        cx="0"
        cy="-13"
        rx="6"
        ry="10"
        fill="#D07888"
        transform="rotate(216,0,0)"
      />
      <ellipse
        cx="0"
        cy="-13"
        rx="6"
        ry="10"
        fill="#D07888"
        transform="rotate(288,0,0)"
      />
      <circle cx="0" cy="0" r="7" fill="#F0C050" />
      <path
        d="M0,7 C1,22 3,38 5,58"
        stroke="#8A7040"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </g>

    {/* ── FLOWER 2 — translate(262,168) — blush rose #E090A0 ── */}
    <g transform="translate(262,168)">
      <ellipse
        cx="0"
        cy="-13"
        rx="6"
        ry="10"
        fill="#E090A0"
        transform="rotate(0,0,0)"
      />
      <ellipse
        cx="0"
        cy="-13"
        rx="6"
        ry="10"
        fill="#E090A0"
        transform="rotate(72,0,0)"
      />
      <ellipse
        cx="0"
        cy="-13"
        rx="6"
        ry="10"
        fill="#E090A0"
        transform="rotate(144,0,0)"
      />
      <ellipse
        cx="0"
        cy="-13"
        rx="6"
        ry="10"
        fill="#E090A0"
        transform="rotate(216,0,0)"
      />
      <ellipse
        cx="0"
        cy="-13"
        rx="6"
        ry="10"
        fill="#E090A0"
        transform="rotate(288,0,0)"
      />
      <circle cx="0" cy="0" r="7" fill="#F0C050" />
      <path
        d="M0,7 C-1,22 -3,38 -5,58"
        stroke="#8A7040"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </g>

    {/* ════════════════════════════════════════════════════════
        LEFT WHEAT STALK  — translate(88, 0) — stroke #A07040
        Stem y=455 → y=85
        6 branch pairs, grains #B88040 (bottom) → #E8B870 (top)
    ════════════════════════════════════════════════════════ */}
    <g transform="translate(88,0)" stroke="#A07040" fill="none">
      {/* Main stem */}
      <path d="M0,455 C4,375 -4,295 0,85" strokeWidth="2.2" />

      {/* Pair 1 — y=385 — grain #B88040 */}
      <path d="M0,385 C-8,375 -16,368 -20,363" strokeWidth="1.4" />
      <ellipse
        cx="-20"
        cy="362"
        rx="7"
        ry="4"
        fill="#B88040"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-35,-20,362)"
      />
      <path d="M0,385 C8,375 16,368 20,363" strokeWidth="1.4" />
      <ellipse
        cx="20"
        cy="362"
        rx="7"
        ry="4"
        fill="#B88040"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(35,20,362)"
      />

      {/* Pair 2 — y=340 — grain #BC8848 */}
      <path d="M0,340 C-8,330 -16,323 -20,318" strokeWidth="1.4" />
      <ellipse
        cx="-20"
        cy="317"
        rx="7"
        ry="4"
        fill="#BC8848"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-35,-20,317)"
      />
      <path d="M0,340 C8,330 16,323 20,318" strokeWidth="1.4" />
      <ellipse
        cx="20"
        cy="317"
        rx="7"
        ry="4"
        fill="#BC8848"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(35,20,317)"
      />

      {/* Pair 3 — y=295 — grain #C49050 */}
      <path d="M0,295 C-8,285 -16,278 -20,273" strokeWidth="1.4" />
      <ellipse
        cx="-20"
        cy="272"
        rx="7"
        ry="4"
        fill="#C49050"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-35,-20,272)"
      />
      <path d="M0,295 C8,285 16,278 20,273" strokeWidth="1.4" />
      <ellipse
        cx="20"
        cy="272"
        rx="7"
        ry="4"
        fill="#C49050"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(35,20,272)"
      />

      {/* Pair 4 — y=250 — grain #CC9858 */}
      <path d="M0,250 C-8,240 -16,233 -20,228" strokeWidth="1.4" />
      <ellipse
        cx="-20"
        cy="227"
        rx="7"
        ry="4"
        fill="#CC9858"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-35,-20,227)"
      />
      <path d="M0,250 C8,240 16,233 20,228" strokeWidth="1.4" />
      <ellipse
        cx="20"
        cy="227"
        rx="7"
        ry="4"
        fill="#CC9858"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(35,20,227)"
      />

      {/* Pair 5 — y=205 — grain #D8A060 */}
      <path d="M0,205 C-8,195 -16,188 -20,183" strokeWidth="1.4" />
      <ellipse
        cx="-20"
        cy="182"
        rx="7"
        ry="4"
        fill="#D8A060"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-35,-20,182)"
      />
      <path d="M0,205 C8,195 16,188 20,183" strokeWidth="1.4" />
      <ellipse
        cx="20"
        cy="182"
        rx="7"
        ry="4"
        fill="#D8A060"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(35,20,182)"
      />

      {/* Pair 6 — y=160 — grain #E8B870 */}
      <path d="M0,160 C-8,150 -16,143 -20,138" strokeWidth="1.4" />
      <ellipse
        cx="-20"
        cy="137"
        rx="7"
        ry="4"
        fill="#E8B870"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-35,-20,137)"
      />
      <path d="M0,160 C8,150 16,143 20,138" strokeWidth="1.4" />
      <ellipse
        cx="20"
        cy="137"
        rx="7"
        ry="4"
        fill="#E8B870"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(35,20,137)"
      />

      {/* Top head cluster */}
      <ellipse
        cx="0"
        cy="76"
        rx="5"
        ry="9"
        fill="#E8B870"
        stroke="#A07040"
        strokeWidth="0.8"
      />
      <ellipse
        cx="-7"
        cy="82"
        rx="4"
        ry="7"
        fill="#E0B060"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-15,-7,82)"
      />
      <ellipse
        cx="7"
        cy="82"
        rx="4"
        ry="7"
        fill="#E0B060"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(15,7,82)"
      />
    </g>

    {/* ════════════════════════════════════════════════════════
        CENTER WHEAT STALK — translate(150, 0) — stroke #906030
        Stem y=455 → y=30  (tallest)
        6 branch pairs, grains #B88040 → #E8B870
    ════════════════════════════════════════════════════════ */}
    <g transform="translate(150,0)" stroke="#906030" fill="none">
      {/* Main stem */}
      <path d="M0,455 C5,368 -5,240 0,30" strokeWidth="2.5" />

      {/* Pair 1 — y=395 — grain #B88040 */}
      <path d="M0,395 C-9,383 -17,376 -22,370" strokeWidth="1.5" />
      <ellipse
        cx="-22"
        cy="369"
        rx="7"
        ry="4.5"
        fill="#B88040"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(-35,-22,369)"
      />
      <path d="M0,395 C9,383 17,376 22,370" strokeWidth="1.5" />
      <ellipse
        cx="22"
        cy="369"
        rx="7"
        ry="4.5"
        fill="#B88040"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(35,22,369)"
      />

      {/* Pair 2 — y=348 — grain #BD8848 */}
      <path d="M0,348 C-9,336 -17,329 -22,323" strokeWidth="1.5" />
      <ellipse
        cx="-22"
        cy="322"
        rx="7"
        ry="4.5"
        fill="#BD8848"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(-35,-22,322)"
      />
      <path d="M0,348 C9,336 17,329 22,323" strokeWidth="1.5" />
      <ellipse
        cx="22"
        cy="322"
        rx="7"
        ry="4.5"
        fill="#BD8848"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(35,22,322)"
      />

      {/* Pair 3 — y=301 — grain #C89050 */}
      <path d="M0,301 C-9,289 -17,282 -22,276" strokeWidth="1.5" />
      <ellipse
        cx="-22"
        cy="275"
        rx="7"
        ry="4.5"
        fill="#C89050"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(-35,-22,275)"
      />
      <path d="M0,301 C9,289 17,282 22,276" strokeWidth="1.5" />
      <ellipse
        cx="22"
        cy="275"
        rx="7"
        ry="4.5"
        fill="#C89050"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(35,22,275)"
      />

      {/* Pair 4 — y=254 — grain #D09858 */}
      <path d="M0,254 C-9,242 -17,235 -22,229" strokeWidth="1.5" />
      <ellipse
        cx="-22"
        cy="228"
        rx="7"
        ry="4.5"
        fill="#D09858"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(-35,-22,228)"
      />
      <path d="M0,254 C9,242 17,235 22,229" strokeWidth="1.5" />
      <ellipse
        cx="22"
        cy="228"
        rx="7"
        ry="4.5"
        fill="#D09858"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(35,22,228)"
      />

      {/* Pair 5 — y=207 — grain #D8A060 */}
      <path d="M0,207 C-9,195 -17,188 -22,182" strokeWidth="1.5" />
      <ellipse
        cx="-22"
        cy="181"
        rx="7"
        ry="4.5"
        fill="#D8A060"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(-35,-22,181)"
      />
      <path d="M0,207 C9,195 17,188 22,182" strokeWidth="1.5" />
      <ellipse
        cx="22"
        cy="181"
        rx="7"
        ry="4.5"
        fill="#D8A060"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(35,22,181)"
      />

      {/* Pair 6 — y=160 — grain #E8B870 */}
      <path d="M0,160 C-9,148 -17,141 -22,135" strokeWidth="1.5" />
      <ellipse
        cx="-22"
        cy="134"
        rx="7"
        ry="4.5"
        fill="#E8B870"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(-35,-22,134)"
      />
      <path d="M0,160 C9,148 17,141 22,135" strokeWidth="1.5" />
      <ellipse
        cx="22"
        cy="134"
        rx="7"
        ry="4.5"
        fill="#E8B870"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(35,22,134)"
      />

      {/* Top head cluster */}
      <ellipse
        cx="0"
        cy="20"
        rx="6"
        ry="10"
        fill="#E8B870"
        stroke="#906030"
        strokeWidth="0.8"
      />
      <ellipse
        cx="-8"
        cy="28"
        rx="5"
        ry="8"
        fill="#E0B060"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(-15,-8,28)"
      />
      <ellipse
        cx="8"
        cy="28"
        rx="5"
        ry="8"
        fill="#E0B060"
        stroke="#906030"
        strokeWidth="0.8"
        transform="rotate(15,8,28)"
      />
    </g>

    {/* ════════════════════════════════════════════════════════
        RIGHT WHEAT STALK — translate(212, 0) — stroke #A07040
        Stem y=455 → y=85  (mirror of left)
        6 branch pairs, grains #B88040 → #E8B870
    ════════════════════════════════════════════════════════ */}
    <g transform="translate(212,0)" stroke="#A07040" fill="none">
      {/* Main stem (curve mirrored) */}
      <path d="M0,455 C-4,375 4,295 0,85" strokeWidth="2.2" />

      {/* Pair 1 — y=385 — grain #B88040 */}
      <path d="M0,385 C8,375 16,368 20,363" strokeWidth="1.4" />
      <ellipse
        cx="20"
        cy="362"
        rx="7"
        ry="4"
        fill="#B88040"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(35,20,362)"
      />
      <path d="M0,385 C-8,375 -16,368 -20,363" strokeWidth="1.4" />
      <ellipse
        cx="-20"
        cy="362"
        rx="7"
        ry="4"
        fill="#B88040"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-35,-20,362)"
      />

      {/* Pair 2 — y=340 — grain #BC8848 */}
      <path d="M0,340 C8,330 16,323 20,318" strokeWidth="1.4" />
      <ellipse
        cx="20"
        cy="317"
        rx="7"
        ry="4"
        fill="#BC8848"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(35,20,317)"
      />
      <path d="M0,340 C-8,330 -16,323 -20,318" strokeWidth="1.4" />
      <ellipse
        cx="-20"
        cy="317"
        rx="7"
        ry="4"
        fill="#BC8848"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-35,-20,317)"
      />

      {/* Pair 3 — y=295 — grain #C49050 */}
      <path d="M0,295 C8,285 16,278 20,273" strokeWidth="1.4" />
      <ellipse
        cx="20"
        cy="272"
        rx="7"
        ry="4"
        fill="#C49050"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(35,20,272)"
      />
      <path d="M0,295 C-8,285 -16,278 -20,273" strokeWidth="1.4" />
      <ellipse
        cx="-20"
        cy="272"
        rx="7"
        ry="4"
        fill="#C49050"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-35,-20,272)"
      />

      {/* Pair 4 — y=250 — grain #CC9858 */}
      <path d="M0,250 C8,240 16,233 20,228" strokeWidth="1.4" />
      <ellipse
        cx="20"
        cy="227"
        rx="7"
        ry="4"
        fill="#CC9858"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(35,20,227)"
      />
      <path d="M0,250 C-8,240 -16,233 -20,228" strokeWidth="1.4" />
      <ellipse
        cx="-20"
        cy="227"
        rx="7"
        ry="4"
        fill="#CC9858"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-35,-20,227)"
      />

      {/* Pair 5 — y=205 — grain #D8A060 */}
      <path d="M0,205 C8,195 16,188 20,183" strokeWidth="1.4" />
      <ellipse
        cx="20"
        cy="182"
        rx="7"
        ry="4"
        fill="#D8A060"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(35,20,182)"
      />
      <path d="M0,205 C-8,195 -16,188 -20,183" strokeWidth="1.4" />
      <ellipse
        cx="-20"
        cy="182"
        rx="7"
        ry="4"
        fill="#D8A060"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-35,-20,182)"
      />

      {/* Pair 6 — y=160 — grain #E8B870 */}
      <path d="M0,160 C8,150 16,143 20,138" strokeWidth="1.4" />
      <ellipse
        cx="20"
        cy="137"
        rx="7"
        ry="4"
        fill="#E8B870"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(35,20,137)"
      />
      <path d="M0,160 C-8,150 -16,143 -20,138" strokeWidth="1.4" />
      <ellipse
        cx="-20"
        cy="137"
        rx="7"
        ry="4"
        fill="#E8B870"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-35,-20,137)"
      />

      {/* Top head cluster */}
      <ellipse
        cx="0"
        cy="76"
        rx="5"
        ry="9"
        fill="#E8B870"
        stroke="#A07040"
        strokeWidth="0.8"
      />
      <ellipse
        cx="7"
        cy="82"
        rx="4"
        ry="7"
        fill="#E0B060"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(15,7,82)"
      />
      <ellipse
        cx="-7"
        cy="82"
        rx="4"
        ry="7"
        fill="#E0B060"
        stroke="#A07040"
        strokeWidth="0.8"
        transform="rotate(-15,-7,82)"
      />
    </g>

    {/* ════════════════════════════════════════════════════════
        ARTISAN BREAD LOAF — centered x=150, y≈398–460
    ════════════════════════════════════════════════════════ */}
    <g>
      {/* Soft shadow ellipse */}
      <ellipse cx="150" cy="453" rx="66" ry="6" fill="#C4884A" opacity="0.18" />

      {/* Main dome body */}
      <path
        d="M78,447 C78,420 95,401 150,398 C205,401 222,420 222,447 C222,455 202,459 150,460 C98,459 78,455 78,447 Z"
        fill="#C4884A"
      />

      {/* Highlight arc across top */}
      <path
        d="M93,412 Q150,400 207,412"
        stroke="#D8A060"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Scoring line 1 */}
      <path
        d="M104,422 Q136,410 170,422"
        stroke="#9A6228"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Scoring line 2 */}
      <path
        d="M132,417 Q165,405 197,417"
        stroke="#9A6228"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Ear cut */}
      <path
        d="M86,433 C88,421 95,416 100,425"
        stroke="#9A6228"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage
// ─────────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async ({ email, password }) => {
    try {
      const { data } = await loginAPI(email, password);
      setAuth(data);
      toast.success("Sesión iniciada correctamente");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const payload = err.response?.data ?? {};
      const detail = payload.detail;

      if (status === 423 || detail === "lockout") {
        toast.error(
          "Tu cuenta fue bloqueada por demasiados intentos fallidos. Intenta de nuevo en 1 hora.",
        );
      } else if (detail === "inactive") {
        toast.error(
          "Tu cuenta está desactivada. Contacta al administrador del sistema.",
        );
      } else if (status === 401 || detail === "invalid") {
        const remaining = payload.remaining_attempts;
        toast.error(
          remaining != null
            ? `Correo o contraseña incorrectos. Intentos restantes: ${remaining}.`
            : "Correo o contraseña incorrectos.",
        );
      } else {
        toast.error("Ocurrió un error inesperado. Intenta de nuevo.");
      }
    }
  };

  const loading = isSubmitting;

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ════════════ LEFT PANEL (lg+) ════════════ */}
      <aside
        aria-hidden="true"
        className="hidden lg:flex lg:w-[42%] flex-col items-center justify-between py-10 px-8"
        style={{
          backgroundColor: "#F2D9C5",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Logo — no blend mode */}
        <img src="/logo.png" className="h-20 object-contain" alt="Daluzed" />

        {/* Centre illustration */}
        <BakeryIllustration />

        {/* Copyright */}
        <p className="text-xs" style={{ color: "#B8937A" }}>
          © 2026 Daluzed
        </p>
      </aside>

      {/* ════════════ RIGHT PANEL ════════════ */}
      <main
        className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto min-h-screen"
        style={{
          backgroundColor: "#FEFAF5",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Mobile-only logo */}
        <img
          src="/logo.png"
          className="lg:hidden h-16 mb-8 object-contain"
          alt="Daluzed"
        />

        <div className="w-full max-w-sm">
          {/* Heading */}
          <h1
            className="text-[2rem] font-bold mb-2 leading-tight"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#3D2010",
            }}
          >
            Bienvenido de vuelta
          </h1>

          {/* Subtitle */}
          <p className="mb-8 text-sm" style={{ color: "#9A7060" }}>
            Accede a tu cuenta
          </p>

          {/* ── Form ── */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            aria-label="Inicio de sesión"
            className="flex flex-col gap-5"
            noValidate
          >
            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="uppercase tracking-wide font-medium"
                style={{ fontSize: "10px", color: "#C4A08A" }}
              >
                Correo electrónico
              </label>
              <div className="relative">
                <span
                  className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none"
                  style={{ color: "#C4A08A" }}
                >
                  <AtIcon />
                </span>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  autoComplete="email"
                  placeholder="tu.correo@daluzed.com"
                  aria-invalid={errors.email ? "true" : "false"}
                  className="w-full rounded-2xl py-3.5 pl-10 pr-4 border text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-[rgba(201,104,112,0.2)]"
                  style={{
                    borderColor: errors.email ? "#FBBFC4" : "#EDD8C4",
                    backgroundColor: "#FDFAF7",
                    color: "#3D2010",
                  }}
                />
              </div>
              {errors.email && (
                <p role="alert" className="text-xs" style={{ color: "#C0404A" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="uppercase tracking-wide font-medium"
                style={{ fontSize: "10px", color: "#C4A08A" }}
              >
                Contraseña
              </label>
              <div className="relative">
                <span
                  className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none"
                  style={{ color: "#C4A08A" }}
                >
                  <LockIcon />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={errors.password ? "true" : "false"}
                  className="w-full rounded-2xl py-3.5 pl-10 pr-11 border text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-[rgba(201,104,112,0.2)]"
                  style={{
                    borderColor: errors.password ? "#FBBFC4" : "#EDD8C4",
                    backgroundColor: "#FDFAF7",
                    color: "#3D2010",
                  }}
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 transition-opacity hover:opacity-70"
                  style={{ color: "#C4A08A" }}
                >
                  {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
                </button>
              </div>
              {errors.password && (
                <p role="alert" className="text-xs" style={{ color: "#C0404A" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: "#C96870" }}
            >
              {loading ? (
                <>
                  <SpinnerIcon />
                  <span>Iniciando sesión…</span>
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center mt-8 text-xs" style={{ color: "#C4A08A" }}>
            Solo personal autorizado
          </p>
        </div>
      </main>
    </div>
  );
}
