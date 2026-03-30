import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Palette, Type, Copy, Check, ChevronDown, Sparkles, MessageSquare, Box, Tag,
  Layers, Download, X, RotateCcw, Zap, Send, KeyRound, Loader2, Brain,
  BarChart3, TrendingUp, Users, ShoppingBag, Star, ArrowRight,
  LayoutDashboard, Store, Globe, Save, Plus, Trash2,
  Menu, ChevronLeft, Smartphone, Tablet, Monitor,
  Wind, Feather, PenLine, Music, ChevronRight,
  Square, Circle, Triangle, Hexagon, Heart, Flame, Smile, Briefcase,
  ToggleLeft, AlertCircle, Search, Settings, Bell, Mail, Calendar,
  Image, FileText, Home, User, LogOut, Shuffle
} from "lucide-react";

/* ╔══════════════════════════════════════════════════════════════╗
   ║  LLM DESIGN SYSTEM BUILDER — 7-Layer Architecture          ║
   ╠══════════════════════════════════════════════════════════════╣
   ║                                                              ║
   ║  LAYER 1: FOUNDATION .............. Pure math & color        ║
   ║    srgbToLinear, linearToSrgb, hexToRgb, rgbToHex           ║
   ║    hexToOklch, oklchToHex, lighten, darken, alpha            ║
   ║    relativeLuminance, contrastRatio, wcagGrade               ║
   ║                                                              ║
   ║  LAYER 2: TOKENS ................. Design token definitions  ║
   ║    SCALE_PRESETS, HARMONIES, spacingScale, typeScale         ║
   ║    MOTION_PRESETS, useMotion, elevationShadow                ║
   ║    FONTS, COLOR_KEYS, DEFAULT_THEME, STARTER_TEMPLATES      ║
   ║    useThemeTokens(t) — resolves theme → computed tokens      ║
   ║                                                              ║
   ║  LAYER 3: ATOMS .................. Reusable UI primitives    ║
   ║    Hoverable, Dropdown, CopyBtn                              ║
   ║    Btn, Badge, Alert, CardShell, ToggleSwitch, TextInput     ║
   ║                                                              ║
   ║  LAYER 4: CONTENT ................ Voice & vibe system       ║
   ║    VIBE_ZONES, VOICE_ARCHETYPES, vibeFromMatrix              ║
   ║    vibeLabel, getVibeZone, getVibeContent                    ║
   ║                                                              ║
   ║  LAYER 5: TEMPLATES .............. Preview compositions      ║
   ║    ThemePalette, ComponentShowcase                           ║
   ║    LandingPreview, DashPreview, MarketPreview                ║
   ║                                                              ║
   ║  LAYER 6: ENGINE ................. Theming & export          ║
   ║    PERSONALITIES, randomTheme                                ║
   ║    VIBE_KEYWORDS, parseVibe, generateThemeLLM               ║
   ║    generateCSS, generateJSON, generatePrompt                 ║
   ║                                                              ║
   ║  LAYER 7: SHELL .................. Builder app chrome        ║
   ║    makeChrome, VibeMatrix                                    ║
   ║    DEVICE_PRESETS, DeviceFrame                               ║
   ║    default export (main app component)                       ║
   ║                                                              ║
   ╚══════════════════════════════════════════════════════════════╝ */

/* ═══════════════════════════════════════════════════════════════
   LAYER 1: FOUNDATION — Pure math, color science, WCAG
   ═══════════════════════════════════════════════════════════════ */

/* OKLCH COLOR PIPELINE */
const srgbToLinear = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const linearToSrgb = c => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? Math.round(c * 12.92 * 255) : Math.round((1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255); };
const hexToRgb = hex => { const m = hex.replace("#", "").match(/.{2}/g); return m ? m.map(v => parseInt(v, 16)) : [0,0,0]; };
const rgbToHex = (r,g,b) => "#" + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,"0")).join("");

function hexToOklch(hex) {
  const [R,G,B] = hexToRgb(hex).map(srgbToLinear);
  const l_ = Math.cbrt(0.4122214708*R + 0.5363325363*G + 0.0514459929*B);
  const m_ = Math.cbrt(0.2119034982*R + 0.6806995451*G + 0.1073969566*B);
  const s_ = Math.cbrt(0.0883024619*R + 0.2817188376*G + 0.6299787005*B);
  const L = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_;
  const a = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_;
  const b = 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_;
  const C = Math.sqrt(a*a + b*b);
  let H = Math.atan2(b, a) * (180/Math.PI); if (H < 0) H += 360;
  return { L, C, H };
}
function oklchToHex(L, C, H) {
  // Binary search to find max chroma that fits sRGB gamut
  const tryHex = (l, c, h) => {
    const a = c*Math.cos(h*Math.PI/180), b = c*Math.sin(h*Math.PI/180);
    const l_ = l + 0.3963377774*a + 0.2158037573*b;
    const m_ = l - 0.1055613458*a - 0.0638541728*b;
    const s_ = l - 0.0894841775*a - 0.1031242749*b;
    const ll=l_*l_*l_, mm=m_*m_*m_, ss=s_*s_*s_;
    const r = 4.0767416621*ll - 3.3077115913*mm + 0.2309699292*ss;
    const g = -1.2684380046*ll + 2.6097574011*mm - 0.3413193965*ss;
    const bb = -0.0041960863*ll - 0.7034186147*mm + 1.7076147010*ss;
    return { r, g, b: bb, inGamut: r >= -0.001 && r <= 1.001 && g >= -0.001 && g <= 1.001 && bb >= -0.001 && bb <= 1.001 };
  };
  let lo = 0, hi = C, bestC = 0;
  // Quick check if full chroma is in gamut
  const full = tryHex(L, C, H);
  if (full.inGamut) {
    return rgbToHex(linearToSrgb(full.r), linearToSrgb(full.g), linearToSrgb(full.b));
  }
  // Binary search for max in-gamut chroma
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (tryHex(L, mid, H).inGamut) { bestC = mid; lo = mid; } else { hi = mid; }
  }
  const res = tryHex(L, bestC, H);
  return rgbToHex(linearToSrgb(res.r), linearToSrgb(res.g), linearToSrgb(res.b));
}
const lighten = (hex, amt) => { const {L,C,H} = hexToOklch(hex); return oklchToHex(Math.min(1, L+(1-L)*amt), C*(1-amt*0.3), H); };
const darken = (hex, amt) => { const {L,C,H} = hexToOklch(hex); return oklchToHex(Math.max(0, L*(1-amt)), C, H); };
const alpha = (hex, a) => { const [r,g,b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };

/* ─── Color Harmony Derivation ─── */
const COLOR_HARMONIES = {
  complementary: { label: "Complementary", desc: "Opposite hues — bold contrast", offsets: [180, 210] },
  analogous:     { label: "Analogous",     desc: "Neighboring hues — cohesive",   offsets: [30, 60] },
  triadic:       { label: "Triadic",       desc: "Even thirds — vibrant balance",  offsets: [120, 240] },
  splitComp:     { label: "Split Comp",    desc: "Flanking complement — nuanced",  offsets: [150, 210] },
  tetradic:      { label: "Tetradic",      desc: "Rectangle — rich variety",       offsets: [60, 180] },
  custom:        { label: "Custom",        desc: "Pick your own colors",            offsets: null },
};
function deriveHarmonyColors(primaryHex, harmonyKey) {
  if (!harmonyKey || harmonyKey === "custom") return null;
  const harmony = COLOR_HARMONIES[harmonyKey];
  if (!harmony || !harmony.offsets) return null;
  const { L, C, H } = hexToOklch(primaryHex);
  // Derive secondary and tertiary by rotating hue, with slight L/C variations for richness
  const sec = oklchToHex(Math.min(1, L * 1.05), C * 0.9, ((H + harmony.offsets[0]) % 360 + 360) % 360);
  const ter = oklchToHex(Math.max(0, L * 0.95), C * 0.85, ((H + harmony.offsets[1]) % 360 + 360) % 360);
  return { secondaryColor: sec, tertiaryColor: ter };
}

/* ═══════════════════════════════════════════════
   WCAG
   ═══════════════════════════════════════════════ */
const relativeLuminance = hex => { const [r,g,b] = hexToRgb(hex).map(srgbToLinear); return 0.2126*r + 0.7152*g + 0.0722*b; };
const contrastRatio = (a, b) => { const L1 = relativeLuminance(a), L2 = relativeLuminance(b); return (Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); };
const wcagGrade = r => r >= 7 ? {grade:"AAA",color:"#10B981"} : r >= 4.5 ? {grade:"AA",color:"#10B981"} : r >= 3 ? {grade:"AA18",color:"#F97316"} : {grade:"Fail",color:"#EF4444"};

/* ═══════════════════════════════════════════════════════════════
   LAYER 2: TOKENS — Design token definitions & useThemeTokens
   ═══════════════════════════════════════════════════════════════ */

/* SCALE ENGINE — spacing presets + independent type scale */
const SCALE_PRESETS = {
  tight:    { name: "Tight",    base: 16, harmony: "minor-third",   desc: "Dense, compact" },
  default:  { name: "Default",  base: 20, harmony: "major-third",   desc: "Balanced" },
  relaxed:  { name: "Relaxed",  base: 24, harmony: "perfect-fourth", desc: "Comfortable" },
  dramatic: { name: "Dramatic", base: 28, harmony: "perfect-fifth",  desc: "Lots of room" },
};

const HARMONIES = {
  "minor-third":   { ratio: 1.200 },
  "major-third":   { ratio: 1.250 },
  "perfect-fourth":{ ratio: 1.333 },
  "perfect-fifth": { ratio: 1.500 },
  "golden":        { ratio: 1.618 },
};

function spacingScale(base, harmony) {
  const r = HARMONIES[harmony]?.ratio || 1.25;
  return { "3xs": Math.max(4, Math.round(base/(r*r*r))), "2xs": Math.max(6, Math.round(base/(r*r))), xs: Math.max(8, Math.round(base/r)), sm: base, md: Math.round(base*r), lg: Math.min(64, Math.round(base*r*r)), xl: Math.min(80, Math.round(base*r*r*r)), "2xl": Math.min(120, Math.round(base*Math.pow(r,4))) };
}
function typeScale(baseFontSize, harmony) {
  const r = HARMONIES[harmony]?.ratio || 1.25;
  const base = Math.max(15, baseFontSize);
  return { xs: Math.max(13, Math.round(base/(r*r))), sm: Math.max(13, Math.round(base/r)), base, md: Math.round(base*r), lg: Math.min(32, Math.round(base*r*r)), xl: Math.min(42, Math.round(base*r*r*r)), "2xl": Math.min(52, Math.round(base*Math.pow(r,4))), display: Math.min(64, Math.round(base*Math.pow(r,5))) };
}

/* ═══════════════════════════════════════════════
   MOTION
   ═══════════════════════════════════════════════ */
/* Motion Systems — three distinct philosophies of movement.
   Smooth: ballroom dancer — fluid, continuous, every move eases into the next.
   Bouncy: swing dancer — springy overshoot, playful settle, elastic energy.
   Sharp:  hip-hop dancer — precise, fast, zero wasted frames, confident snap. */
const MOTION_PRESETS = {
  none:   { name: "None", css: "none", desc: "No animation",
    definition: "Motion disabled. All state changes are instant. Use when accessibility prefers-reduced-motion, or for data-dense UIs where animation is distracting.",
    durations: { micro: 0, small: 0, medium: 0, large: 0 },
    easing: { default: "linear", enter: "linear", exit: "linear", move: "linear" },
    cssVars: { "--motion-duration-micro":"0ms","--motion-duration-sm":"0ms","--motion-duration-md":"0ms","--motion-duration-lg":"0ms","--motion-easing":"linear","--motion-easing-enter":"linear","--motion-easing-exit":"linear" },
  },
  smooth: { name: "Smooth", css: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)", desc: "Fluid & calm",
    definition: "Fluid, continuous movement. Every transition eases in and out gently — nothing sudden, nothing jarring. Elements glide between states like a deep breath. Ideal for editorial, wellness, luxury, or any UI that wants to feel calm and intentional.",
    durations: { micro: 120, small: 200, medium: 350, large: 500 },
    easing: {
      default: "cubic-bezier(0.4, 0, 0.2, 1)",   // ease-in-out
      enter: "cubic-bezier(0.0, 0, 0.2, 1)",      // ease-out (decelerate in)
      exit: "cubic-bezier(0.4, 0, 1, 1)",          // ease-in (accelerate out)
      move: "cubic-bezier(0.4, 0, 0.2, 1)",        // standard ease
    },
    cssVars: { "--motion-duration-micro":"120ms","--motion-duration-sm":"200ms","--motion-duration-md":"350ms","--motion-duration-lg":"500ms","--motion-easing":"cubic-bezier(0.4, 0, 0.2, 1)","--motion-easing-enter":"cubic-bezier(0.0, 0, 0.2, 1)","--motion-easing-exit":"cubic-bezier(0.4, 0, 1, 1)" },
  },
  bouncy: { name: "Bouncy", css: "all 0.5s cubic-bezier(0.22, 1.8, 0.36, 1)", desc: "Rubber band stretch & release",
    definition: "Rubber band physics. Elements stretch past their target then snap back — like pulling a rubber band and letting go. Big overshoot, satisfying settle. Feels alive and tactile. Ideal for consumer apps, playful brands, onboarding, and anything that should feel delightful and physical.",
    durations: { micro: 180, small: 350, medium: 500, large: 700 },
    easing: {
      default: "cubic-bezier(0.22, 1.8, 0.36, 1)",    // heavy spring overshoot
      enter: "cubic-bezier(0.12, 1.6, 0.28, 1.4)",     // elastic pop-in
      exit: "cubic-bezier(0.6, -0.4, 0.735, 0.045)",    // rubber band pull-back
      move: "cubic-bezier(0.22, 1.8, 0.36, 1)",
    },
    cssVars: { "--motion-duration-micro":"180ms","--motion-duration-sm":"350ms","--motion-duration-md":"500ms","--motion-duration-lg":"700ms","--motion-easing":"cubic-bezier(0.22, 1.8, 0.36, 1)","--motion-easing-enter":"cubic-bezier(0.12, 1.6, 0.28, 1.4)","--motion-easing-exit":"cubic-bezier(0.6, -0.4, 0.735, 0.045)" },
  },
  sharp: { name: "Sharp", css: "all 0.08s cubic-bezier(0, 0, 0, 1)", desc: "SNAP — neobrutalist",
    definition: "Instant, jarring SNAP. Zero easing, zero softness. Elements teleport into place with brutal authority — think neobrutalism. State changes feel like a light switch. No grace, all impact. Ideal for bold brands, brutalist design, dev tools, and UIs that punch.",
    durations: { micro: 30, small: 60, medium: 100, large: 150 },
    easing: {
      default: "cubic-bezier(0, 0, 0, 1)",         // near-instant decelerate
      enter: "cubic-bezier(0, 0, 0, 1)",            // hard snap in
      exit: "cubic-bezier(1, 0, 1, 0)",             // hard snap out
      move: "cubic-bezier(0, 0, 0, 1)",
    },
    cssVars: { "--motion-duration-micro":"30ms","--motion-duration-sm":"60ms","--motion-duration-md":"100ms","--motion-duration-lg":"150ms","--motion-easing":"cubic-bezier(0, 0, 0, 1)","--motion-easing-enter":"cubic-bezier(0, 0, 0, 1)","--motion-easing-exit":"cubic-bezier(1, 0, 1, 0)" },
  },
};

/* ═══════════════════════════════════════════════
   MOTION TOKEN LAYER — useMotion(t) hook
   Returns ready-to-spread style objects per interaction type.
   Think of it like a lighting rig: each preset controls
   the intensity, timing, and flavor of every animation.
   ═══════════════════════════════════════════════ */
function useMotion(t) {
  return useMemo(() => {
    const p = MOTION_PRESETS[t.motionPreset] || MOTION_PRESETS.none;
    const off = t.motionPreset === "none";
    const d = p.durations;
    const e = p.easing;

    // Transition strings at each duration tier
    const micro = off ? "none" : `all ${d.micro}ms ${e.default}`;
    const sm    = off ? "none" : `all ${d.small}ms ${e.default}`;
    const md    = off ? "none" : `all ${d.medium}ms ${e.default}`;
    const lg    = off ? "none" : `all ${d.large}ms ${e.default}`;
    // Specialized transitions
    const enter = off ? "none" : `all ${d.medium}ms ${e.enter}`;
    const exit  = off ? "none" : `all ${d.small}ms ${e.exit}`;
    const move  = off ? "none" : `all ${d.medium}ms ${e.move}`;

    // Transform presets per motion system
    const isSmooth = t.motionPreset === "smooth";
    const isBouncy = t.motionPreset === "bouncy";
    const isSharp  = t.motionPreset === "sharp";

    // Elevation awareness: flat = no hover shadows
    const isFlat = (t.elevation ?? 1) === 0;

    return {
      off,
      // Raw transition strings
      micro, sm, md, lg, enter, exit, move,
      // Hover: card lift
      // Smooth = gentle float up. Bouncy = rubber band stretch up. Sharp = instant snap up.
      hoverLift: off ? { filter: "brightness(1.06)", background: alpha(t.accentColor, 0.04) } : {
        transform: isBouncy ? "translateY(-12px) scale(1.05)" : isSharp ? "translateY(-2px)" : "translateY(-4px)",
        boxShadow: isFlat ? "none" : isBouncy ? `0 24px 48px ${alpha(t.textColor,0.2)}` : isSharp ? `0 4px 12px ${alpha(t.textColor,0.1)}` : `0 12px 28px ${alpha(t.textColor,0.12)}`,
      },
      // Hover: glow for nav links, small elements
      // Smooth = subtle brightness. Bouncy = scale pop. Sharp = instant color shift.
      hoverGlow: off ? { filter: "brightness(1.1)", opacity: 0.85 } : {
        transform: isBouncy ? "scale(1.12)" : isSharp ? "none" : "scale(1.03)",
        filter: isSharp ? "brightness(1.2)" : isBouncy ? "brightness(1.08)" : "brightness(1.05)",
      },
      // Press: visible squish
      // Bouncy = deep squish. Sharp = hard snap down. Smooth = gentle sink.
      press: off ? { opacity: 0.7, filter: "brightness(0.92)" } : {
        transform: isBouncy ? "scale(0.85)" : isSharp ? "scale(0.96) translateY(1px)" : "scale(0.95)",
      },
      // Active/selected
      selected: off ? { outline: `2px solid ${t.accentColor}`, outlineOffset: "2px" } : {
        transform: isBouncy ? "scale(1.06)" : isSharp ? "none" : "scale(1.03)",
        boxShadow: isSharp ? `0 0 0 2px ${t.accentColor}` : "none",
      },
      // Enter: element appearing
      // Smooth = float up gently. Bouncy = spring from below. Sharp = appear instantly with slight offset.
      enterFrom: off ? {} : {
        opacity: isSharp ? 0 : 0,
        transform: isBouncy ? "translateY(30px) scale(0.85)" : isSharp ? "translateY(4px)" : "translateY(16px) scale(0.97)",
      },
      enterTo: off ? {} : {
        opacity: 1,
        transform: "translateY(0) scale(1)",
      },
      // Button hover — respects flat elevation (no shadow when flat)
      // Smooth = gentle rise. Bouncy = playful pop. Sharp = instant snap with hard border flash.
      btnHover: off ? { filter: "brightness(1.12)", opacity: 0.9 } : {
        transform: isBouncy ? "translateY(-6px) scale(1.08)" : isSharp ? "none" : "translateY(-2px)",
        boxShadow: isFlat ? "none" : isBouncy ? `0 12px 32px ${alpha(t.accentColor,0.4)}` : isSharp ? `0 2px 8px ${alpha(t.accentColor,0.2)}` : `0 6px 20px ${alpha(t.accentColor,0.25)}`,
        filter: isSharp ? "brightness(1.15)" : "none",
      },
      // Card expand — animate content reveal downward
      expand: off ? { background: alpha(t.accentColor, 0.04) } : {
        boxShadow: isFlat ? "none" : `0 12px 36px ${alpha(t.textColor,0.12)}`,
      },
      // Row highlight
      rowHover: off ? { background: alpha(t.accentColor, 0.08), filter: "brightness(1.04)" } : {
        background: alpha(t.accentColor, 0.06),
        transform: isBouncy ? "translateX(4px)" : isSharp ? "translateX(2px)" : "none",
      },
      // Link hover — text decoration + color shift
      linkHover: off ? { opacity: 0.8, textDecoration: "underline" } : {
        color: t.accentColor,
        textDecoration: isSharp ? "underline" : "none",
        transform: isBouncy ? "translateX(2px)" : "none",
      },
      // Link press
      linkPress: off ? { opacity: 0.6 } : {
        opacity: 0.7,
        transform: isBouncy ? "scale(0.97)" : isSharp ? "none" : "scale(0.98)",
      },
      // Logo hover — bounce/sharp only, no press (logos are not pressable)
      logoHover: off ? { filter: "brightness(1.1)" } : {
        transform: isBouncy ? "scale(1.15) rotate(-3deg)" : isSharp ? "scale(1.08)" : "scale(1.06)",
        filter: "brightness(1.1)",
      },
      // Scroll appear
      scrollAppear: off ? {} : {
        transform: isBouncy ? "translateY(40px) scale(0.88)" : isSharp ? "translateY(6px)" : "translateY(20px) scale(0.96)",
        opacity: 0,
      },
      // Preset metadata
      preset: t.motionPreset,
      durations: d,
      easing: e,
    };
  }, [t.motionPreset, t.textColor, t.accentColor, t.elevation]);
}

function elevationShadow(level, textColor) {
  const a = alpha(textColor, 0.04+level*0.02), b = alpha(textColor, 0.02+level*0.01);
  if (level === 0) return "none";
  if (level === 1) return `0 1px 2px ${a}`;
  if (level === 2) return `0 2px 6px ${a}, 0 1px 2px ${b}`;
  if (level === 3) return `0 4px 12px ${a}, 0 2px 4px ${b}`;
  return `0 8px 24px ${a}, 0 4px 8px ${b}`;
}

/* ═══════════════════════════════════════════════
   FONTS
   ═══════════════════════════════════════════════ */
const FONTS = [
  { name: "System Default", value: "system-ui, -apple-system, sans-serif", cat: "sans" },
  // Sans-serif
  { name: "Inter", value: "'Inter', sans-serif", cat: "sans" },
  { name: "DM Sans", value: "'DM Sans', sans-serif", cat: "sans" },
  { name: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif", cat: "sans" },
  { name: "Space Grotesk", value: "'Space Grotesk', sans-serif", cat: "sans" },
  { name: "Outfit", value: "'Outfit', sans-serif", cat: "sans" },
  { name: "Sora", value: "'Sora', sans-serif", cat: "sans" },
  { name: "Manrope", value: "'Manrope', sans-serif", cat: "sans" },
  { name: "Poppins", value: "'Poppins', sans-serif", cat: "sans" },
  { name: "Raleway", value: "'Raleway', sans-serif", cat: "sans" },
  { name: "Montserrat", value: "'Montserrat', sans-serif", cat: "sans" },
  { name: "Open Sans", value: "'Open Sans', sans-serif", cat: "sans" },
  { name: "Roboto", value: "'Roboto', sans-serif", cat: "sans" },
  { name: "Lato", value: "'Lato', sans-serif", cat: "sans" },
  { name: "Nunito", value: "'Nunito', sans-serif", cat: "sans" },
  { name: "Rubik", value: "'Rubik', sans-serif", cat: "sans" },
  { name: "Work Sans", value: "'Work Sans', sans-serif", cat: "sans" },
  { name: "Figtree", value: "'Figtree', sans-serif", cat: "sans" },
  { name: "Geist", value: "'Geist', sans-serif", cat: "sans" },
  { name: "Albert Sans", value: "'Albert Sans', sans-serif", cat: "sans" },
  { name: "Cabin", value: "'Cabin', sans-serif", cat: "sans" },
  { name: "Karla", value: "'Karla', sans-serif", cat: "sans" },
  { name: "Lexend", value: "'Lexend', sans-serif", cat: "sans" },
  { name: "Red Hat Display", value: "'Red Hat Display', sans-serif", cat: "sans" },
  { name: "Archivo", value: "'Archivo', sans-serif", cat: "sans" },
  // Serif
  { name: "Lora", value: "'Lora', serif", cat: "serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif", cat: "serif" },
  { name: "Source Serif 4", value: "'Source Serif 4', serif", cat: "serif" },
  { name: "Merriweather", value: "'Merriweather', serif", cat: "serif" },
  { name: "DM Serif Display", value: "'DM Serif Display', serif", cat: "serif" },
  { name: "Libre Baskerville", value: "'Libre Baskerville', serif", cat: "serif" },
  { name: "Crimson Text", value: "'Crimson Text', serif", cat: "serif" },
  { name: "EB Garamond", value: "'EB Garamond', serif", cat: "serif" },
  { name: "Fraunces", value: "'Fraunces', serif", cat: "serif" },
  { name: "Bitter", value: "'Bitter', serif", cat: "serif" },
  // Mono
  { name: "JetBrains Mono", value: "'JetBrains Mono', monospace", cat: "mono" },
  { name: "Fira Code", value: "'Fira Code', monospace", cat: "mono" },
  { name: "IBM Plex Mono", value: "'IBM Plex Mono', monospace", cat: "mono" },
  { name: "Source Code Pro", value: "'Source Code Pro', monospace", cat: "mono" },
  { name: "Space Mono", value: "'Space Mono', monospace", cat: "mono" },
  // Display
  { name: "Bebas Neue", value: "'Bebas Neue', sans-serif", cat: "display" },
  { name: "Righteous", value: "'Righteous', sans-serif", cat: "display" },
  { name: "Comfortaa", value: "'Comfortaa', sans-serif", cat: "display" },
  { name: "Josefin Sans", value: "'Josefin Sans', sans-serif", cat: "display" },
  { name: "Dela Gothic One", value: "'Dela Gothic One', sans-serif", cat: "display" },
];
function loadFont(name) {
  if (name === "System Default") return;
  const id = `gf-${name.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id; link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

/* ═══════════════════════════════════════════════════════════════
   LAYER 7: SHELL — Builder app chrome, device frame, main app
   ═══════════════════════════════════════════════════════════════ */

/* Always-dark chrome color scheme */
const makeChrome = (accent, secondary) => {
  // Ensure accent is always readable on dark chrome bg (#0C0C10)
  const ensureLight = (hex) => {
    const {L, C, H} = hexToOklch(hex);
    // If too dark for dark chrome, lighten it
    return L < 0.5 ? oklchToHex(Math.max(0.65, L + 0.35), Math.max(C, 0.08), H) : hex;
  };
  return {
    bg: "#0C0C10", surface: "#151519", text: "#E2E2E8", muted: "#6E6E80",
    border: "#27272F", accent: ensureLight(accent), secondary: ensureLight(secondary)
  };
};

/* ═══════════════════════════════════════════════
   STYLE PERSONALITIES — named bundles
   ═══════════════════════════════════════════════ */
const PERSONALITIES = {
  "clean": {
    name: "Clean & Classic", desc: "Stripe, Linear, Notion vibes",
    accentColor: "#0A66C2", secondaryColor: "#6941C6", tertiaryColor: "#0F766E",
    surfaceColor: "#FFFFFF", backgroundColor: "#FAFAFA",
    textColor: "#1A1A2E", mutedColor: "#6B7280", borderColor: "#E5E7EB",
    dangerColor: "#DC2626", successColor: "#047857", warningColor: "#B45309",
    borderRadius: 10, scale: "default", fontSize: 16, typeHarmony: "major-third",
    bodyFont: "Inter", headingFont: "Inter", motionPreset: "smooth", elevation: 1,
    colorModePolicy: "both", vibeX: 55, vibeY: 45,
  },
  "dark-tech": {
    name: "Dark Tech", desc: "Vercel, GitHub, Arc vibes",
    accentColor: "#00D4FF", secondaryColor: "#A78BFA", tertiaryColor: "#34D399",
    surfaceColor: "#18181B", backgroundColor: "#09090B",
    textColor: "#FAFAFA", mutedColor: "#71717A", borderColor: "#27272A",
    dangerColor: "#FB7185", successColor: "#34D399", warningColor: "#FBBF24",
    borderRadius: 8, scale: "tight", fontSize: 15, typeHarmony: "minor-third",
    bodyFont: "Space Grotesk", headingFont: "Space Grotesk", motionPreset: "sharp", elevation: 0,
    colorModePolicy: "dark-only", vibeX: 65, vibeY: 35,
  },
  "bubbly": {
    name: "Bubbly", desc: "Figma, Notion, Slack vibes",
    accentColor: "#7C3AED", secondaryColor: "#BE185D", tertiaryColor: "#0369A1",
    surfaceColor: "#FFFFFF", backgroundColor: "#FFF7ED",
    textColor: "#1E1B4B", mutedColor: "#6B6B8A", borderColor: "#E9E5F5",
    dangerColor: "#BE123C", successColor: "#047857", warningColor: "#A16207",
    borderRadius: 22, scale: "relaxed", fontSize: 16, typeHarmony: "major-third",
    bodyFont: "DM Sans", headingFont: "Sora", motionPreset: "bouncy", elevation: 2,
    colorModePolicy: "both", vibeX: 35, vibeY: 65,
  },
  "editorial": {
    name: "Editorial", desc: "Medium, Substack, NYT vibes",
    accentColor: "#B45309", secondaryColor: "#7C2D12", tertiaryColor: "#1E40AF",
    surfaceColor: "#FFFBF5", backgroundColor: "#FAF5EF",
    textColor: "#1C1917", mutedColor: "#78716C", borderColor: "#E7E5E4",
    dangerColor: "#B91C1C", successColor: "#15803D", warningColor: "#A16207",
    borderRadius: 4, scale: "dramatic", fontSize: 18, typeHarmony: "perfect-fourth",
    bodyFont: "Source Serif 4", headingFont: "Playfair Display", motionPreset: "smooth", elevation: 1,
    colorModePolicy: "light-only", vibeX: 40, vibeY: 55,
  },
  "neon": {
    name: "Neon Glow", desc: "Discord, Spotify, gaming vibes",
    accentColor: "#8B5CF6", secondaryColor: "#EC4899", tertiaryColor: "#22D3EE",
    surfaceColor: "#1E1B2E", backgroundColor: "#0F0D1A",
    textColor: "#E8E4F0", mutedColor: "#9894A4", borderColor: "#2D2A3E",
    dangerColor: "#FB7185", successColor: "#34D399", warningColor: "#FBBF24",
    borderRadius: 14, scale: "default", fontSize: 16, typeHarmony: "major-third",
    bodyFont: "Outfit", headingFont: "Sora", motionPreset: "bouncy", elevation: 2,
    colorModePolicy: "dark-only", vibeX: 30, vibeY: 70,
  },
  "minimal": {
    name: "Minimal", desc: "Apple, Muji, Dieter Rams vibes",
    accentColor: "#171717", secondaryColor: "#525252", tertiaryColor: "#0369A1",
    surfaceColor: "#FFFFFF", backgroundColor: "#FAFAFA",
    textColor: "#0A0A0A", mutedColor: "#737373", borderColor: "#E5E5E5",
    dangerColor: "#B91C1C", successColor: "#15803D", warningColor: "#A16207",
    borderRadius: 6, scale: "relaxed", fontSize: 16, typeHarmony: "major-third",
    bodyFont: "Plus Jakarta Sans", headingFont: "Plus Jakarta Sans", motionPreset: "smooth", elevation: 1,
    colorModePolicy: "both", vibeX: 60, vibeY: 40,
  },
};

/* ═══════════════════════════════════════════════
   RANDOMIZER — generates a random WCAG-safe theme
   ═══════════════════════════════════════════════ */
function randomTheme() {
  const rnd = (lo,hi) => lo + Math.random()*(hi-lo);
  const rndInt = (lo,hi) => Math.round(rnd(lo,hi));
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];
  // Random accent hue, truly random across full 360
  const aH = rnd(0,360), aC = rnd(0.08,0.18), aL = rnd(0.4,0.7);
  const accentColor = oklchToHex(aL, aC, aH);
  // Secondary: complementary or analogous
  const sH = Math.random()>0.5 ? (aH+180+rnd(-30,30))%360 : (aH+rnd(30,90))%360;
  const secondaryColor = oklchToHex(rnd(0.4,0.7), rnd(0.08,0.18), sH);
  // Tertiary: triadic
  const tertiaryColor = oklchToHex(rnd(0.4,0.7), rnd(0.08,0.18), (aH+120+rnd(-20,20))%360);
  // Light or dark mode
  const isDark = Math.random() > 0.6;
  const backgroundColor = isDark ? oklchToHex(rnd(0.08,0.15),rnd(0,0.015),aH) : oklchToHex(rnd(0.96,0.99),rnd(0,0.015),aH);
  const surfaceColor = isDark ? oklchToHex(rnd(0.15,0.22),rnd(0,0.015),aH) : oklchToHex(rnd(0.98,1),rnd(0,0.015),aH);
  const textColor = isDark ? oklchToHex(rnd(0.88,0.95),rnd(0,0.02),aH) : oklchToHex(rnd(0.1,0.2),rnd(0,0.02),aH);
  const mutedColor = oklchToHex(rnd(0.45,0.6),rnd(0.01,0.04),aH);
  const borderColor = isDark ? oklchToHex(rnd(0.25,0.35),rnd(0,0.015),aH) : oklchToHex(rnd(0.85,0.92),rnd(0,0.015),aH);
  // Semantic — keep recognizable hue ranges but shift slightly
  const dangerColor = oklchToHex(rnd(0.5,0.6), rnd(0.18,0.24), rnd(20,35));
  const successColor = oklchToHex(rnd(0.55,0.65), rnd(0.12,0.2), rnd(145,165));
  const warningColor = oklchToHex(rnd(0.7,0.8), rnd(0.14,0.2), rnd(75,95));
  // Verify WCAG AA for text on bg
  let finalText = textColor;
  if (contrastRatio(finalText, backgroundColor) < 4.5) {
    const {C:tC,H:tH} = hexToOklch(finalText);
    finalText = isDark ? oklchToHex(0.95,tC,tH) : oklchToHex(0.1,tC,tH);
  }
  const nonMonoFonts = FONTS.filter(f=>f.cat!=="mono");
  const bodyFont = pick(nonMonoFonts).name;
  const headingFont = Math.random()>0.4 ? bodyFont : pick(nonMonoFonts).name;
  const scales = Object.keys(SCALE_PRESETS);
  const motions = Object.keys(MOTION_PRESETS);
  const harmonies = Object.keys(HARMONIES);
  // Sometimes use a color harmony to derive secondary/tertiary
  const harmonyKeys = Object.keys(COLOR_HARMONIES).filter(k=>k!=="custom");
  const useHarmony = Math.random() > 0.4;
  const colorHarmony = useHarmony ? pick(harmonyKeys) : "custom";
  const derived = useHarmony ? deriveHarmonyColors(accentColor, colorHarmony) : null;
  return {
    accentColor,
    secondaryColor: derived?.secondaryColor || secondaryColor,
    tertiaryColor: derived?.tertiaryColor || tertiaryColor,
    surfaceColor, backgroundColor,
    textColor: finalText, mutedColor, borderColor, dangerColor, successColor, warningColor,
    borderRadius: pick([4,8,12,14,18,22,26]),
    scale: pick(scales), fontSize: pick([15,16,17,18]),
    typeHarmony: pick(harmonies),
    bodyFont, headingFont, monoFont: "JetBrains Mono",
    motionPreset: pick(motions), elevation: rndInt(0,2), borderWeight: rndInt(0,2),
    colorModePolicy: "both",
    colorHarmony,
    iconStyle: pick(["outlined","filled"]), iconWeight: pick([300,400,600]),

    vibeX: rndInt(5,95), vibeY: rndInt(5,95),
  };
}


/* ═══════════════════════════════════════════════
   DEFAULT THEME
   ═══════════════════════════════════════════════ */
const COLOR_KEYS = ["accentColor","secondaryColor","tertiaryColor","surfaceColor","backgroundColor","textColor","mutedColor","borderColor","dangerColor","successColor","warningColor"];
const DEFAULT_THEME = {
  accentColor: "#6E56CF", secondaryColor: "#E5484D", tertiaryColor: "#3B82F6",
  surfaceColor: "#FFFFFF", backgroundColor: "#FAFAFA",
  textColor: "#1A1A1A", mutedColor: "#6B7280", borderColor: "#E5E7EB",
  dangerColor: "#EF4444", successColor: "#10B981", warningColor: "#F59E0B",
  borderRadius: 14, scale: "default", fontSize: 16, typeHarmony: "major-third",
  bodyFont: "System Default", headingFont: "System Default", monoFont: "JetBrains Mono",
  motionPreset: "smooth", elevation: 1,
  colorModePolicy: "both",
  colorHarmony: "custom",

  iconLibrary: "lucide",
  vibeX: 50, vibeY: 50,
};

const STARTER_TEMPLATES = {
  bright: { ...DEFAULT_THEME, name: "Bright", accentColor: "#FF6B2C", secondaryColor: "#00C9A7", backgroundColor: "#FFFBF5", borderColor: "#FFE0CC", bodyFont: "DM Sans", headingFont: "DM Sans", motionPreset: "bouncy", vibeX: 25, vibeY: 20, scale: "relaxed" },
  moody: { ...DEFAULT_THEME, name: "Moody", accentColor: "#8B5CF6", secondaryColor: "#64748B", surfaceColor: "#1E1B2E", backgroundColor: "#13111C", textColor: "#E2E0ED", mutedColor: "#8B8BA3", borderColor: "#2D2A42", borderRadius: 10, bodyFont: "Space Grotesk", headingFont: "Space Grotesk", motionPreset: "sharp", vibeX: 70, vibeY: 70, scale: "tight", elevation: 3 },
  y2k: { ...DEFAULT_THEME, name: "Y2K", accentColor: "#FF2D95", secondaryColor: "#C0C0C0", surfaceColor: "#FFF0F7", backgroundColor: "#FFF5FA", textColor: "#2D1B33", mutedColor: "#9B7FA8", borderColor: "#FFCCE5", borderRadius: 22, bodyFont: "Outfit", headingFont: "Sora", motionPreset: "bouncy", vibeX: 15, vibeY: 10, scale: "dramatic" },
  aura: { ...DEFAULT_THEME, name: "Aura", accentColor: "#A78BFA", secondaryColor: "#67E8F9", surfaceColor: "#FEFEFF", backgroundColor: "#F5F3FF", textColor: "#2E2950", mutedColor: "#8B85AD", borderColor: "#E4DAFF", borderRadius: 18, bodyFont: "Sora", headingFont: "Sora", vibeX: 45, vibeY: 40, scale: "dramatic" },
};

/* ═══════════════════════════════════════════════
   VIBE MATRIX HELPERS
   ═══════════════════════════════════════════════ */
function vibeFromMatrix(x, y) {
  // x = friendly→formal, y = playful→serious
  // Zone archetypes shape the curves:
  //   Bubbly (low x, low y): max energy, max emoji, high humor, zero formality
  //   Warm (low x, mid y): high warmth, moderate energy, friendly not hyper
  //   Chill (low x, high y): calm, minimal, understated, comfortable with brevity
  const energy = Math.round(Math.max(0, Math.min(100, 100 - y * 1.1 + (x < 33 && y < 33 ? 15 : 0))));
  const warmth = Math.round(Math.max(0, Math.min(100,
    100 - x * 0.7 - Math.abs(y - 50) * 0.3 + (x < 33 && y > 20 && y < 66 ? 20 : 0)
  )));
  const humor = Math.round(Math.max(0, Math.min(100,
    90 - x * 0.5 - y * 0.6 + (y < 33 ? 15 : 0)
  )));
  const verbosity = Math.round(Math.max(0, Math.min(100,
    y > 66 && x < 33 ? Math.max(10, 20 - (100 - y) * 0.3) : // Chill = terse
    30 + y * 0.3 + x * 0.3
  )));
  const emojiDensity = Math.round(Math.max(0, Math.min(100,
    y < 33 && x < 50 ? 80 - x * 0.8 : // Bubbly = emoji-heavy
    70 - x * 0.5 - y * 0.7
  )));
  return { formality: x, warmth, energy, humor, verbosity, emojiDensity };
}
function vibeLabel(x, y) {
  const xL = x < 33 ? "Friendly" : x < 66 ? "Balanced" : "Formal";
  const yL = y < 33 ? "Playful" : y < 66 ? "Neutral" : "Serious";
  return `${xL} / ${yL}`;
}

/* ═══════════════════════════════════════════════
   VIBE-DRIVEN CONTENT
   ═══════════════════════════════════════════════ */
function getVibeZone(x, y) {
  return VIBE_ZONES[y < 33 ? 0 : y < 66 ? 1 : 2][x < 33 ? 0 : x < 66 ? 1 : 2];
}

/* Full 9-zone archetype definitions — exported in LLM prompt handoff */
const VOICE_ARCHETYPES = {
  Bubbly: {
    definition: "High-energy, emoji-rich, exclamatory. Speaks like an enthusiastic friend who just discovered something amazing. Short punchy sentences, lots of emphasis, exclamation marks. Radiates excitement.",
    traits: { formality: "none", warmth: "high", energy: "max", humor: "playful", verbosity: "short bursts", emoji: "heavy" },
  },
  Whimsical: {
    definition: "Playful and imaginative with a sense of wonder. Creative word choices, gentle humor, slightly dreamy. Finds delight in small details. Speaks like a storyteller who sees magic in everyday things.",
    traits: { formality: "low", warmth: "moderate", energy: "high", humor: "clever", verbosity: "medium, lyrical", emoji: "occasional" },
  },
  Quirky: {
    definition: "Unexpected and pleasantly surprising. Blends formal structure with playful energy. Slightly offbeat word choices, dry wit, charming contradictions. The well-dressed person at the party telling the funniest stories.",
    traits: { formality: "moderate", warmth: "cool-warm", energy: "high", humor: "dry/witty", verbosity: "medium", emoji: "rare" },
  },
  Warm: {
    definition: "Friendly and genuine, like a neighbor who remembers your name. Conversational, empathetic, encouraging without being loud. Uses 'you' often, feels personal. Makes people feel seen and valued.",
    traits: { formality: "none", warmth: "max", energy: "moderate", humor: "gentle", verbosity: "medium, flowing", emoji: "sometimes" },
  },
  Balanced: {
    definition: "Even-keeled, adaptable, and clear. Neither too casual nor too formal — the reliable middle ground. Confident without being stiff, friendly without being familiar. Works in any context.",
    traits: { formality: "moderate", warmth: "moderate", energy: "moderate", humor: "light", verbosity: "concise", emoji: "minimal" },
  },
  Poised: {
    definition: "Polished and confident with measured warmth. Professional but approachable — like a well-prepared host. Chooses words carefully, never wastes a sentence. Elegant without being cold.",
    traits: { formality: "high", warmth: "restrained", energy: "moderate", humor: "subtle", verbosity: "precise", emoji: "none" },
  },
  Chill: {
    definition: "Calm, understated, minimal. Comfortable with brevity and white space. Speaks in short, confident statements. Cool without being cold — relaxed, unfussy, effortless. The friend who just nods and it's enough.",
    traits: { formality: "none", warmth: "low-key", energy: "low", humor: "deadpan", verbosity: "very short", emoji: "none" },
  },
  Grounded: {
    definition: "Steady, practical, no-nonsense. Values clarity and substance over style. Direct but not harsh. Like a trusted advisor who gives you the facts and lets you decide. Prefers doing over talking.",
    traits: { formality: "moderate", warmth: "neutral", energy: "low", humor: "none", verbosity: "short, direct", emoji: "none" },
  },
  Corporate: {
    definition: "Structured, authoritative, precise. Clean language, executive tone, data-driven. Every word serves a purpose. Speaks to outcomes, metrics, and impact. Commands respect through clarity.",
    traits: { formality: "max", warmth: "none", energy: "low", humor: "none", verbosity: "thorough, measured", emoji: "never" },
  },
};

function getVibeContent(voice, vibeX, vibeY) {
  const em = voice.emojiDensity;
  const emoji = em > 40;
  const zone = getVibeZone(vibeX ?? voice.formality, vibeY ?? 50);

  // z: pick by zone name
  const z = (...vals) => {
    const map = {Bubbly:0,Whimsical:1,Quirky:2,Warm:3,Balanced:4,Poised:5,Chill:6,Grounded:7,Corporate:8};
    return vals[map[zone]] ?? vals[4]; // fallback to Balanced
  };

  return {
    /* LANDING — Project management SaaS */
    landing: {
      brand: z("flowtask","Wonderflow","Oddly","Kindred","Launchpad","Meridian","basecamp","Bedrock","Pinnacle"),
      navLinks: z(
        ["How it works","Pricing","Community","Log in"],
        ["Explore","Features","Journal","Sign in"],
        ["What is this","Pricing","Weird stuff","Enter"],
        ["About","Features","Stories","Sign in"],
        ["Product","Pricing","About","Sign in"],
        ["Solutions","Capabilities","Insights","Contact"],
        ["Product","Pricing","Docs","Log in"],
        ["Product","Pricing","Resources","Sign in"],
        ["Solutions","Enterprise","Security","Contact"]
      ),
      headline: z(
        emoji ? "Get more done, stress less \u2728" : "Get more done, stress less",
        "Where ideas find their wings",
        "Project management, but make it interesting",
        "Build something meaningful",
        "Ship projects on time",
        "Precision meets momentum",
        "Ship. Track. Done.",
        "Plan work. Do work.",
        "Orchestrate complex workflows"
      ),
      headlineAccent: z(
        emoji ? "your team will thank you \u{1F64C}" : "your team will thank you",
        "and every plan tells a story",
        "yes, we said interesting",
        "with people who care",
        "every single time",
        "at every scale",
        "No noise.",
        "Repeat.",
        "with precision and scale"
      ),
      subtitle: z(
        emoji ? "Plan, track, and launch together. No more spreadsheet chaos! \u{1F389}" : "Plan, track, and launch together. No more chaos!",
        "A project space that sparks creativity and keeps the magic flowing, from first sketch to final ship.",
        "We took the soul-crushing parts out of project management. You're welcome.",
        "Project tools that feel human. Built for teams that value connection as much as velocity.",
        "Smart project tracking for teams that move fast.",
        "Streamlined portfolio management for teams that deliver consistently and confidently.",
        "Simple project tracking. Nothing extra.",
        "Reliable project management that works the way you do. No tricks.",
        "Unified project intelligence for cross-functional teams managing enterprise portfolios."
      ),
      cta: z(emoji ? "Try it free \u{1F680}" : "Try it free","Begin the journey","Try the weird one","Start your story","Get Started","Request Access","Get started","Start now","Schedule Demo"),
      ctaSecondary: z("Watch the tour","See the magic","How it actually works","Meet the team","See Plans","View Case Studies","See plans","Read docs","Read Case Studies"),
      features: z(
        [{t:emoji?"\u{1F4CA} Dashboards":"Dashboards",d:"See everything your team is up to at a glance!"},{t:emoji?"\u26A1 Automations":"Automations",d:"Set rules once, let the boring stuff handle itself."},{t:emoji?"\u{1F465} Collab":"Collab",d:"Comments, mentions, shared views — all in one place!"}],
        [{t:"Dream Boards",d:"Pin ideas, move them around, watch plans take shape like a living sketchbook."},{t:"Story Timelines",d:"Every project has chapters — see yours unfold beautifully."},{t:"Spark Notes",d:"Little nudges and insights sprinkled throughout your workflow."}],
        [{t:"Anti-Gantt Charts",d:"Visual planning that doesn't make your eyes glaze over."},{t:"Smart-ish Alerts",d:"Notifications with personality. They know when to bug you."},{t:"Team Vibes",d:"See who's in flow state and who needs a coffee break."}],
        [{t:"Shared Spaces",d:"Work alongside your team with context and care."},{t:"Gentle Reminders",d:"Nudges, not nags — keep everyone moving forward."},{t:"Team Pulse",d:"See how your team is feeling, not just what they shipped."}],
        [{t:"Visual Boards",d:"Kanban, timeline, and list views."},{t:"Smart Alerts",d:"Know when things slip before they're late."},{t:"Team Spaces",d:"Organize by squad, project, or goal."}],
        [{t:"Intelligent Workflows",d:"Adaptive task routing that responds to real-time team capacity."},{t:"Predictive Analytics",d:"Surface delivery risks before they escalate."},{t:"Executive Dashboards",d:"Portfolio health at a glance for leadership."}],
        [{t:"Boards",d:"Kanban. That's it."},{t:"Automations",d:"Set once. Forget."},{t:"Reports",d:"Clean data, no fluff."}],
        [{t:"Task Management",d:"Assign, track, complete. Clear ownership at every step."},{t:"Timeline Views",d:"See your schedule laid out. Spot conflicts early."},{t:"Progress Reports",d:"Numbers you can trust. Updated in real time."}],
        [{t:"Portfolio Analytics",d:"Real-time dashboards synthesize cross-project data for executive visibility."},{t:"Workflow Automation",d:"Conditional triggers and approval chains reduce manual coordination."},{t:"Compliance Tracking",d:"Built-in audit trails and access controls for regulated industries."}]
      ),
      testimonial: z(
        emoji ? "\"We ditched three other tools for this. Best decision ever \u{1F525}\"" : "\"We ditched three other tools for this. Best decision ever.\"",
        "\"It made project planning feel like painting on a canvas.\"",
        "\"Honestly didn't expect project software to make me smile.\"",
        "\"It's the first tool that actually made our team feel closer, not just faster.\"",
        "\"Finally, a project tool that doesn't get in the way.\"",
        "\"The most elegant project platform we've deployed across our organization.\"",
        "\"Clean. Fast. Done.\"",
        "\"It does what it says. That's rare.\"",
        "\"Pinnacle reduced our project delivery cycle by 34% in the first quarter.\""
      ),
      testimonialAuthor: z("— Marcus, eng lead","— Luna, creative director","— Raj, indie dev","— Aisha R., People Ops","— Jamie K., Head of Product","— Catherine L., VP Operations","— Dev, CTO","— Tom S., Engineering Manager","— Priya Sharma, COO"),
      footerCopy: z(
        emoji ? "Made with \u2764\uFE0F by the flowtask crew" : "Made with care by the flowtask crew",
        "\u00A9 2026 Wonderflow \u2022 Made with curiosity",
        "\u00A9 2026 Oddly. Don't ask.",
        "\u00A9 2026 Kindred. Built with heart.",
        "\u00A9 2026 Launchpad | Privacy | Terms",
        "\u00A9 2026 Meridian. All rights reserved.",
        "\u00A9 2026 basecamp",
        "\u00A9 2026 Bedrock | Privacy | Terms",
        "\u00A9 2026 Pinnacle Inc. All rights reserved."
      ),
      socialProofText: z("Join 10,000+ teams already shipping faster","Trusted by dreamers and doers everywhere","Used by people with questionable taste (like us)","Join thousands of teams building together","Join 10,000+ teams","Trusted by 10,000+ organizations worldwide","10k+ teams.","Trusted by 10,000+ teams globally","Adopted by 10,000+ enterprise organizations"),
      socialProofAvatars: ["Alex","Sam","Jordan","Taylor","Morgan"],
      newsletterHeadline: z("Stay in the loop!","Get updates and inspiration","We'll email you. Not too much.","Stay connected with us","Get Updates","Subscribe to Our Newsletter","Updates","Subscribe for Updates","Subscribe to Product Updates"),
      newsletterCta: z("Subscribe","Sign me up!","Sure, email me","Join us","Subscribe","Subscribe","Sub","Subscribe","Subscribe"),
      newsletterPlaceholder: z("your@email.com","email@example.com","your.email@here.com","your@email.com","Email address","Email address","Email","Email address","Professional email address"),
      /* Logo bar — trusted-by company names */
      logos: ["Vercel","Stripe","Linear","Notion","Figma"],
      /* Stats strip */
      stats: z(
        [{v:"10k+",l:"happy teams"},{v:"4.9",l:"App Store"},{v:"99.9%",l:"uptime"}],
        [{v:"10k+",l:"stories started"},{v:"4.9",l:"delight score"},{v:"50M+",l:"moments tracked"}],
        [{v:"10k+",l:"brave souls"},{v:"4.9",l:"weirdly high"},{v:"99.9%",l:"mostly works"}],
        [{v:"10k+",l:"teams connected"},{v:"4.9",l:"avg rating"},{v:"99.9%",l:"uptime"}],
        [{v:"10k+",l:"active teams"},{v:"4.9",l:"rating"},{v:"99.9%",l:"uptime"}],
        [{v:"10,000+",l:"organizations"},{v:"4.9/5",l:"satisfaction"},{v:"99.99%",l:"availability"}],
        [{v:"10k+",l:"teams"},{v:"4.9",l:"stars"},{v:"99.9%",l:"up"}],
        [{v:"10,000+",l:"teams"},{v:"4.9/5",l:"rating"},{v:"99.9%",l:"uptime"}],
        [{v:"10,000+",l:"enterprise clients"},{v:"4.9/5",l:"G2 rating"},{v:"99.99%",l:"SLA uptime"}]
      ),
      /* Pricing tiers */
      pricing: z(
        [{n:"Free",p:"$0",d:"For small crews",fs:["5 projects","Basic boards",emoji?"Community \u{1F64B}":"Community"]},{n:"Pro",p:"$12",d:"For growing teams",fs:["Unlimited projects","Automations","Priority support"],pop:true},{n:"Team",p:"$29",d:"Full power",fs:["Everything in Pro","Analytics","SSO & audit"]}],
        [{n:"Starter",p:"$0",d:"Begin your journey",fs:["5 dream boards","Story timelines","Community garden"]},{n:"Creator",p:"$12",d:"Unlock the magic",fs:["Unlimited boards","Spark notes","Priority whispers"],pop:true},{n:"Studio",p:"$29",d:"Full enchantment",fs:["Everything in Creator","Custom themes","Dedicated guide"]}],
        [{n:"Free",p:"$0",d:"See if it's weird enough",fs:["5 projects","Anti-Gantt charts","Email support (eventually)"]},{n:"Pro",p:"$12",d:"The good stuff",fs:["Unlimited everything","Smart-ish alerts","Actual humans respond"],pop:true},{n:"Biz",p:"$29",d:"Go full send",fs:["All of Pro","Team vibes dashboard","SSO & compliance"]}],
        [{n:"Starter",p:"$0",d:"Get to know us",fs:["5 shared spaces","Gentle reminders","Community"]},{n:"Growth",p:"$12",d:"For teams that care",fs:["Unlimited spaces","Team pulse","Priority support"],pop:true},{n:"Org",p:"$29",d:"For larger teams",fs:["Everything in Growth","Advanced insights","Dedicated success partner"]}],
        [{n:"Free",p:"$0",d:"For individuals",fs:["3 projects","Core features","Community support"]},{n:"Pro",p:"$12",d:"For teams",fs:["Unlimited projects","Automations","Priority support"],pop:true},{n:"Business",p:"$29",d:"For organizations",fs:["Everything in Pro","Analytics","SSO"]}],
        [{n:"Starter",p:"$0",d:"For evaluation",fs:["5 workspaces","Standard workflows","Community resources"]},{n:"Professional",p:"$12",d:"For scaling teams",fs:["Unlimited workspaces","Predictive analytics","Priority response"],pop:true},{n:"Enterprise",p:"Custom",d:"For organizations",fs:["Full platform access","Dedicated success manager","Custom SLA"]}],
        [{n:"Free",p:"$0",d:"Basics",fs:["3 boards","Automations","Community"]},{n:"Pro",p:"$12",d:"More",fs:["Unlimited","Reports","Support"],pop:true},{n:"Biz",p:"$29",d:"Everything",fs:["Pro + SSO","Analytics","SLA"]}],
        [{n:"Starter",p:"$0",d:"For small teams",fs:["5 projects","Task management","Community forum"]},{n:"Professional",p:"$12",d:"For growing teams",fs:["Unlimited projects","Timeline views","Priority support"],pop:true},{n:"Business",p:"$29",d:"For companies",fs:["Everything in Pro","Progress reports","SSO & audit"]}],
        [{n:"Starter",p:"$0",d:"For evaluation",fs:["5 portfolios","Standard analytics","Documentation"]},{n:"Professional",p:"$12/seat",d:"For departments",fs:["Unlimited portfolios","Workflow automation","Dedicated CSM"],pop:true},{n:"Enterprise",p:"Custom",d:"For organizations",fs:["Full platform","Compliance suite","Executive reporting"]}]
      ),
      /* FAQ items */
      faq: z(
        [{q:"Is there a free plan?",a:"Yep! Free forever for up to 5 projects."},{q:"Can I switch plans later?",a:"Totally! Upgrade or downgrade anytime."},{q:"Do you offer team discounts?",a:"We sure do — the bigger the crew, the better the deal."}],
        [{q:"How do I get started?",a:"Just sign up and your first dream board is ready in seconds."},{q:"Can I bring my team along?",a:"Of course — the more the merrier. Invite as many as you'd like."},{q:"What makes this different?",a:"We believe project tools should spark joy, not just track tasks."}],
        [{q:"Is this actually good?",a:"Weirdly, yes. We were surprised too."},{q:"Can I cancel anytime?",a:"No contracts, no guilt trips. Leave whenever."},{q:"Do you have an API?",a:"A delightfully over-documented one, yes."}],
        [{q:"Is there a free plan?",a:"Yes — free for up to 5 spaces, no credit card needed."},{q:"How does billing work?",a:"Monthly or annual, your choice. Annual saves you about 20%."},{q:"Can I invite my whole team?",a:"Absolutely. Everyone's welcome."}],
        [{q:"Is there a free tier?",a:"Yes, free for up to 3 projects with core features included."},{q:"Can I change plans?",a:"Upgrade or downgrade anytime from your settings."},{q:"What support is included?",a:"Community on Free, priority email on Pro, dedicated rep on Business."}],
        [{q:"What does the evaluation period include?",a:"Full access to Starter features with no time limitation."},{q:"How is pricing structured?",a:"Per-seat monthly or annual billing. Volume discounts available."},{q:"Do you offer custom deployments?",a:"Enterprise plans include dedicated infrastructure options."}],
        [{q:"Free plan?",a:"Yes. 3 boards."},{q:"Cancel anytime?",a:"Yes."},{q:"API?",a:"Yes. Docs at /api."}],
        [{q:"Is there a free plan?",a:"Yes. Starter includes 5 projects at no cost."},{q:"Can I switch plans?",a:"Yes, upgrade or downgrade from account settings."},{q:"What support do you offer?",a:"Community forums on Starter, priority email on Professional, dedicated rep on Business."}],
        [{q:"What is the evaluation process?",a:"Starter tier provides unlimited-duration access to core functionality for up to 5 portfolios."},{q:"How are enterprise agreements structured?",a:"Custom pricing based on seat count, feature requirements, and SLA parameters."},{q:"What compliance certifications do you hold?",a:"SOC 2 Type II, ISO 27001, GDPR, and HIPAA-eligible configurations."}]
      ),
      /* Footer link groups */
      footerLinks: z(
        {product:["Features","Pricing","Changelog"],company:["About","Blog","Careers"],support:["Help Center","Community","Status"]},
        {product:["Explore","Pricing","Updates"],company:["Our Story","Journal","Join Us"],support:["Help","Community","Status"]},
        {product:["The Thing","Pricing","What's New"],company:["Who We Are","Blog","Jobs (Maybe)"],support:["Help","Community","Uptime"]},
        {product:["Features","Pricing","Updates"],company:["About Us","Stories","Careers"],support:["Help Center","Community","Contact"]},
        {product:["Features","Pricing","Changelog"],company:["About","Blog","Careers"],support:["Help","Community","Status"]},
        {product:["Solutions","Pricing","Release Notes"],company:["About","Insights","Careers"],support:["Documentation","Support","Status"]},
        {product:["Product","Pricing","Log"],company:["About","Blog","Jobs"],support:["Docs","Help","Status"]},
        {product:["Features","Pricing","Changelog"],company:["About","Blog","Careers"],support:["Help Center","Docs","Status"]},
        {product:["Solutions","Plans","Release Notes"],company:["About","Research","Careers"],support:["Documentation","Support Portal","System Status"]}
      ),
    },
    /* DASHBOARD — Fitness / health tracker */
    dash: {
      greeting: z(
        emoji ? "Hey champ! \u{1F44B}" : "Let's gooo",
        "A peek at your adventure",
        "Your stats (the fun kind)",
        "Welcome back — you're doing great",
        "Today's Progress",
        "Performance Overview",
        "Today",
        "Daily Summary",
        "Weekly Health Summary"
      ),
      subtitle: z(
        emoji ? "Here's how you've been crushing it \u{1F4AA}" : "Here's how you've been crushing it!",
        "Every step is part of your story.",
        "Numbers with personality.",
        "Here's a gentle look at how your week is going.",
        "Your daily activity snapshot.",
        "Key health indicators for the current period.",
        "Steps. Cals. Sleep.",
        "What happened today.",
        "Aggregated wellness metrics for the current tracking period."
      ),
      chartTitle: z(
        emoji ? "Your streak \u{1F525}" : "Streak!",
        "The journey so far",
        "Steps (or lack thereof)",
        "Your movement this week",
        "Steps This Week",
        "Weekly Activity Index",
        "Steps",
        "Weekly Steps",
        "Activity Trend Analysis"
      ),
      statsLabels: z(["Steps","Cals","Sleep"],["Steps","Energy","Rest"],["Steps","Cals","Zzz"],["Steps","Calories","Rest"],["Steps","Calories","Sleep"],["Steps Logged","Energy Burned","Sleep Index"],["Steps","Cal","Slp"],["Steps","Calories","Sleep"],["Steps Logged","Calories Burned","Sleep Score"]),
      tableTitle: z("Latest sessions","Movement diary","The workout log of destiny","Recent activity","Workout Log","Exercise Summary","Log","Activity Log","Recent Workouts"),
      tableRows: z(
        [{n:"Weights",s:"Done",a:"48m"},{n:"Run",s:"Active",a:"32m"},{n:"Stretch",s:"Later",a:"20m"}],
        [{n:"Morning Stroll",s:"Done",a:"40 min"},{n:"Dance Session",s:"Done",a:"25 min"},{n:"Evening Wind-down",s:"Planned",a:"15 min"}],
        [{n:"Heavy Things",s:"Done",a:"48m"},{n:"Fast Moving",s:"Ongoing",a:"32m"},{n:"Bendy Time",s:"Maybe",a:"20m"}],
        [{n:"Morning Walk",s:"Done",a:"35 min"},{n:"Yoga Flow",s:"Done",a:"28 min"},{n:"Evening Stretch",s:"Planned",a:"15 min"}],
        [{n:"Strength",s:"Done",a:"48 min"},{n:"Cardio",s:"Active",a:"32 min"},{n:"Mobility",s:"Scheduled",a:"20 min"}],
        [{n:"Resistance Training",s:"Complete",a:"48 min"},{n:"Cardiovascular",s:"In Progress",a:"32 min"},{n:"Recovery Session",s:"Pending",a:"20 min"}],
        [{n:"Strength",s:"\u2713",a:"48m"},{n:"Cardio",s:"...",a:"32m"},{n:"Mobility",s:"\u2014",a:"20m"}],
        [{n:"Strength",s:"Done",a:"48 min"},{n:"Cardio",s:"Active",a:"32 min"},{n:"Mobility",s:"Scheduled",a:"20 min"}],
        [{n:"Strength Training",s:"Completed",a:"48 min"},{n:"Zone 2 Cardio",s:"Active",a:"32 min"},{n:"Mobility Session",s:"Scheduled",a:"20 min"}]
      ),
      sidebarLinks: z(
        ["Home","Activity","Goals","Settings"],["Home","Journey","Insights","Settings"],["Home","Stuff","Numbers","Gear"],
        ["Home","Activity","Goals","Settings"],["Dashboard","Activity","Goals","Settings"],["Overview","Analytics","Objectives","Configuration"],
        ["Home","Stats","Goals","Prefs"],["Dashboard","Activity","Goals","Settings"],["Overview","Activity","Objectives","Settings"]
      ),
      sidebarUser: z("Alex","Luna","Zep","Sam","Alex M.","A. Mitchell","AK","Alex","Alexander M."),
      sidebarRole: z("Fitness fan","Adventure seeker","Casual mover","Wellness journey","Member since 2024","Pro Plan","Free","Member","Enterprise Plan"),
      breadcrumbs: z(["Home","Dashboard","Weekly"],["Home","Journey","This Week"],["Home","Stats","Week"],["Home","Dashboard","Week"],["Home","Dashboard","Weekly View"],["Home","Analytics","Weekly Report"],["Home","Dash","Week"],["Home","Dashboard","Weekly"],["Home","Analytics","Weekly Summary"]),
      progressMetrics: z(
        [{l:"Steps Goal",v:72,c:"accent"},{l:"Calories",v:58,c:"secondary"},{l:"Hydration",v:85,c:"tertiary"}],
        [{l:"Journey Progress",v:72,c:"accent"},{l:"Energy Spent",v:58,c:"secondary"},{l:"Water Intake",v:85,c:"tertiary"}],
        [{l:"Steps-ish",v:72,c:"accent"},{l:"Burnt Stuff",v:58,c:"secondary"},{l:"Drinks",v:85,c:"tertiary"}],
        [{l:"Step Goal",v:72,c:"accent"},{l:"Calorie Goal",v:58,c:"secondary"},{l:"Hydration",v:85,c:"tertiary"}],
        [{l:"Steps",v:72,c:"accent"},{l:"Calories",v:58,c:"secondary"},{l:"Hydration",v:85,c:"tertiary"}],
        [{l:"Step Completion",v:72,c:"accent"},{l:"Caloric Expenditure",v:58,c:"secondary"},{l:"Hydration Index",v:85,c:"tertiary"}],
        [{l:"Steps",v:72,c:"accent"},{l:"Cals",v:58,c:"secondary"},{l:"H2O",v:85,c:"tertiary"}],
        [{l:"Steps",v:72,c:"accent"},{l:"Calories",v:58,c:"secondary"},{l:"Hydration",v:85,c:"tertiary"}],
        [{l:"Step Attainment",v:72,c:"accent"},{l:"Energy Expenditure",v:58,c:"secondary"},{l:"Fluid Intake",v:85,c:"tertiary"}]
      ),
      tabLabels: z(["Overview","Activity","Goals"],["Snapshot","Movement","Dreams"],["Main","Workouts","Targets"],["Summary","Activity","Goals"],["Overview","Activity","Goals"],["Summary","Analytics","Objectives"],["All","Active","Goals"],["Overview","Activity","Goals"],["Executive Summary","Activity Log","Objective Tracking"]),
      activityFeed: z(
        [{t:"Morning run completed",d:"32 min \u2022 4.2 km",ago:"2h"},{t:"Hydration goal reached",d:"8 glasses",ago:"5h"},{t:"New personal best!",d:"Bench press: 185 lbs",ago:"1d"}],
        [{t:"Morning adventure done",d:"32 min of exploring",ago:"2h"},{t:"Water milestone!",d:"8 glasses of sparkle",ago:"5h"},{t:"Record broken!",d:"New strength high",ago:"1d"}],
        [{t:"Ran (barely)",d:"32 min \u2022 survived",ago:"2h"},{t:"Drank water",d:"8 whole glasses",ago:"5h"},{t:"Lifted heavy things",d:"185 lbs, no big deal",ago:"1d"}],
        [{t:"Morning run finished",d:"32 min \u2022 4.2 km",ago:"2h"},{t:"Hydration goal met",d:"8 glasses today",ago:"5h"},{t:"New record set",d:"Bench press: 185 lbs",ago:"1d"}],
        [{t:"Run completed",d:"32 min \u2022 4.2 km",ago:"2h"},{t:"Hydration goal met",d:"8/8 glasses",ago:"5h"},{t:"New PR",d:"Bench: 185 lbs",ago:"1d"}],
        [{t:"Cardiovascular session logged",d:"32 min \u2022 4.2 km",ago:"2h"},{t:"Hydration target achieved",d:"8/8 servings",ago:"5h"},{t:"Performance milestone",d:"185 lb bench press",ago:"1d"}],
        [{t:"Run done",d:"32m/4.2km",ago:"2h"},{t:"Water done",d:"8/8",ago:"5h"},{t:"PR",d:"185lb bench",ago:"1d"}],
        [{t:"Run completed",d:"32 min \u2022 4.2 km",ago:"2h"},{t:"Hydration goal met",d:"8 of 8 glasses",ago:"5h"},{t:"Personal record",d:"Bench press: 185 lbs",ago:"1d"}],
        [{t:"Cardiovascular activity recorded",d:"32 min \u2022 4.2 km",ago:"2h"},{t:"Hydration objective achieved",d:"8/8 daily servings",ago:"5h"},{t:"Performance benchmark",d:"Upper body: 185 lb",ago:"1d"}]
      ),
      emptyTitle: z("Nothing here yet!","The story begins...","Crickets.","No data yet","No Data","No Records Found","Empty","No data available","No Records Available"),
      emptyDesc: z("Start a workout to see your stats!","Begin your first adventure.","Do something and this won't be empty.","Complete an activity to see results here.","Complete an activity to populate this view.","Submit an activity record to generate analytics.","Go do stuff.","Complete an activity to see data.","Activity records will appear once submitted."),
    },
    /* MARKET — Plant & garden shop */
    market: {
      headline: z(
        emoji ? "Plant paradise \u{1F33F}" : "Fresh green picks!",
        "A garden of wonders",
        "Plants (the original tech)",
        "Grow something beautiful",
        "Shop Plants",
        "Curated Botanicals",
        "Plants",
        "Shop Plants",
        "Botanical Collection"
      ),
      searchPlaceholder: z("Find your next plant baby...","Discover something that grows...","Search for green things...","What are you looking for?","Search plants...","Search our collection...","Search...","Find plants...","Search our botanical catalog..."),
      categories: z(
        ["Everything","Tropical vibes","Lil succs","Pots & stuff"],
        ["All Wonders","Tropical Dreams","Desert Gems","Vessels"],
        ["The Lot","Hot & Humid","Prickly Pals","Gear"],
        ["All Plants","Tropicals","Succulents","Planters"],
        ["All","Tropical","Succulent","Accessories"],
        ["Full Collection","Tropical","Succulent","Accessories"],
        ["All","Tropical","Succulent","Gear"],
        ["All","Tropical","Succulent","Supplies"],
        ["All Specimens","Tropicals","Succulents","Accessories"]
      ),
      addToCart: z(emoji ? "Grab it \u{1F33B}" : "Get it!","Bring it home","Sure, why not","Add to bag","Add","Select","Add","Add","Add to Cart"),
      priceLabel: z("","","","","","Price","","","Price"),
      breadcrumbs: z(["Home","Shop","Plants"],["Home","Garden","Browse"],["Home","Store","Stuff"],["Home","Shop","Browse"],["Home","Shop","All Plants"],["Home","Collection","Browse"],["Home","Shop","All"],["Home","Shop","Plants"],["Home","Catalog","Browse All"]),
      sortOptions: z(["Popular","Price: Low","Price: High","Newest"],["Most Loved","Cheapest","Fanciest","Just In"],["Best","Cheap","Pricey","New"],["Popular","Low to High","High to Low","New"],["Popular","Price: Low","Price: High","Newest"],["Relevance","Price Ascending","Price Descending","Recently Added"],["Top","Low","High","New"],["Popular","Price: Low","Price: High","Newest"],["Relevance","Price: Ascending","Price: Descending","Date Added"]),
      products: z(
        [{n:"Monstera Deliciosa",p:"$49",d:"Lush tropical beauty"},{n:"Snake Plant",p:"$29",d:"Nearly indestructible"},{n:"Fiddle Leaf Fig",p:"$65",d:"Statement piece"},{n:"Pothos Golden",p:"$19",d:"Trailing goodness"},{n:"Bird of Paradise",p:"$79",d:"Tropical drama"},{n:"ZZ Plant",p:"$35",d:"Low-light champ"}],
        [{n:"Monstera Magic",p:"$49",d:"A tropical dream"},{n:"Sansevieria",p:"$29",d:"The quiet hero"},{n:"Fiddle Leaf",p:"$65",d:"Living sculpture"},{n:"Golden Pothos",p:"$19",d:"Cascade of green"},{n:"Bird of Paradise",p:"$79",d:"Paradise found"},{n:"ZZ Wonder",p:"$35",d:"Thrives on neglect"}],
        [{n:"Monstera",p:"$49",d:"Big. Green. Holes."},{n:"Snake Plant",p:"$29",d:"Basically immortal"},{n:"Fiddle Fig",p:"$65",d:"High maintenance queen"},{n:"Pothos",p:"$19",d:"Can't kill it"},{n:"Bird o' Paradise",p:"$79",d:"Will outgrow you"},{n:"ZZ Plant",p:"$35",d:"Forget to water it"}],
        [{n:"Monstera",p:"$49",d:"Beautiful tropical foliage"},{n:"Snake Plant",p:"$29",d:"Hardy and elegant"},{n:"Fiddle Leaf",p:"$65",d:"A gorgeous focal point"},{n:"Golden Pothos",p:"$19",d:"Easy trailing vine"},{n:"Bird of Paradise",p:"$79",d:"Bold tropical flair"},{n:"ZZ Plant",p:"$35",d:"Graceful and low-key"}],
        [{n:"Monstera",p:"$49",d:"Tropical foliage"},{n:"Snake Plant",p:"$29",d:"Low maintenance"},{n:"Fiddle Leaf",p:"$65",d:"Statement plant"},{n:"Pothos",p:"$19",d:"Trailing vine"},{n:"Bird of Paradise",p:"$79",d:"Large tropical"},{n:"ZZ Plant",p:"$35",d:"Low light"}],
        [{n:"Monstera Deliciosa",p:"$49.00",d:"Premium tropical specimen"},{n:"Sansevieria Trifasciata",p:"$29.00",d:"Resilient air-purifying cultivar"},{n:"Ficus Lyrata",p:"$65.00",d:"Architectural focal specimen"},{n:"Epipremnum Aureum",p:"$19.00",d:"Versatile trailing cultivar"},{n:"Strelitzia Reginae",p:"$79.00",d:"Statement tropical specimen"},{n:"Zamioculcas Zamiifolia",p:"$35.00",d:"Low-maintenance cultivar"}],
        [{n:"Monstera",p:"$49",d:"Tropical"},{n:"Snake",p:"$29",d:"Easy"},{n:"Fiddle",p:"$65",d:"Big"},{n:"Pothos",p:"$19",d:"Trails"},{n:"Bird",p:"$79",d:"Bold"},{n:"ZZ",p:"$35",d:"Chill"}],
        [{n:"Monstera",p:"$49",d:"Tropical plant"},{n:"Snake Plant",p:"$29",d:"Low maintenance"},{n:"Fiddle Leaf",p:"$65",d:"Statement plant"},{n:"Pothos",p:"$19",d:"Trailing vine"},{n:"Bird of Paradise",p:"$79",d:"Tropical"},{n:"ZZ Plant",p:"$35",d:"Low light"}],
        [{n:"Monstera Deliciosa",p:"$49.00",d:"Tropical specimen"},{n:"Sansevieria",p:"$29.00",d:"Air-purifying"},{n:"Ficus Lyrata",p:"$65.00",d:"Architectural"},{n:"Epipremnum",p:"$19.00",d:"Trailing"},{n:"Strelitzia",p:"$79.00",d:"Statement"},{n:"Zamioculcas",p:"$35.00",d:"Low-maintenance"}]
      ),
      reviewSummary: z(
        {avg:4.7,count:128,label:"reviews"},
        {avg:4.7,count:128,label:"happy stories"},
        {avg:4.7,count:128,label:"opinions"},
        {avg:4.7,count:128,label:"reviews"},
        {avg:4.7,count:128,label:"reviews"},
        {avg:4.7,count:128,label:"customer evaluations"},
        {avg:4.7,count:128,label:"reviews"},
        {avg:4.7,count:128,label:"reviews"},
        {avg:4.7,count:128,label:"verified reviews"}
      ),
      reviews: z(
        [{a:"Plant Mom",r:5,t:"Arrived in perfect condition!",ago:"3d"},{a:"Green Thumb",r:4,t:"Beautiful but smaller than expected",ago:"1w"}],
        [{a:"Garden Fairy",r:5,t:"This plant sparkles!",ago:"3d"},{a:"Leaf Lover",r:4,t:"Lovely but petite",ago:"1w"}],
        [{a:"Plant Nerd",r:5,t:"10/10 would buy again",ago:"3d"},{a:"Skeptic",r:4,t:"Fine. It's nice.",ago:"1w"}],
        [{a:"Anna",r:5,t:"Gorgeous and healthy",ago:"3d"},{a:"Marcus",r:4,t:"Nice quality, a bit small",ago:"1w"}],
        [{a:"Sarah K.",r:5,t:"Perfect condition",ago:"3d"},{a:"Mike R.",r:4,t:"Good quality, smaller than shown",ago:"1w"}],
        [{a:"S. Kim",r:5,t:"Excellent specimen quality",ago:"3d"},{a:"M. Roberts",r:4,t:"Satisfactory, dimensions below listing",ago:"1w"}],
        [{a:"SK",r:5,t:"Great",ago:"3d"},{a:"MR",r:4,t:"Good, small",ago:"1w"}],
        [{a:"Sarah",r:5,t:"Arrived perfect",ago:"3d"},{a:"Mike",r:4,t:"Good quality",ago:"1w"}],
        [{a:"S. Kim",r:5,t:"Exceptional quality",ago:"3d"},{a:"M. Roberts",r:4,t:"Satisfactory specimen",ago:"1w"}]
      ),
      emptyTitle: z("Your cart is empty!","Nothing in the basket yet!","Cart's lonely.","No items yet","Empty Cart","Cart Empty","Empty","No items","Cart is Empty"),
      emptyDesc: z("Browse our plants and find your new green friend!","Explore the garden to find treasures.","Go find some plants.","Add plants to get started.","Add items to your cart to continue.","Browse our collection to begin.","Shop.","Add items to continue.","Select items from our catalog."),
      checkoutCta: z("Checkout","Complete Order","Buy the plants","Proceed","Checkout","Proceed to Checkout","Pay","Checkout","Complete Purchase"),
    },
    /* CHAT — Recipe / cooking assistant */
    chat: {
      userMsg: z(
        emoji ? "What can I use instead of buttermilk? \u{1F95B}" : "What can I use instead of buttermilk??",
        "I'm on a baking adventure — what works instead of buttermilk?",
        "Buttermilk: overrated or essential? What's the swap?",
        "Hey, do you know any good buttermilk substitutes?",
        "Any good buttermilk substitutes for baking?",
        "Could you recommend a suitable buttermilk alternative?",
        "Buttermilk sub?",
        "What's a reliable buttermilk substitute?",
        "What substitutions work for buttermilk in baking recipes?"
      ),
      greeting: z(
        emoji ? "Oh great question! \u{1F60A} You've got a few easy options!" : "Great question! You've got options!",
        "Ooh, love this question! Buttermilk is basically tangy magic, but we can recreate it.",
        "Ah, the buttermilk question. It comes up more than you'd think.",
        "That's a really common one — and you probably already have what you need in the fridge.",
        "There are a few reliable swaps you can try.",
        "Certainly. Several alternatives perform comparably in most applications.",
        "A few options.",
        "Good question. Here are the standard substitutes.",
        "Several effective substitutions exist depending on the desired outcome in your recipe."
      ),
      slotExplainer: z(
        emoji ? "Here are my faves \u{1F447}" : "Here's what I'd try:",
        "Each one brings its own little twist:",
        "The contenders, ranked by weirdness:",
        "Here's what I usually reach for:",
        "Common substitutes:",
        "Recommended alternatives:",
        "Try:",
        "Options:",
        "The following alternatives maintain comparable acidity and fat content:"
      ),
      followUp: z(
        emoji ? "Want me to tweak amounts for your recipe? \u{1F373}" : "Want me to adjust for your recipe?",
        "Tell me what you're making and I'll tailor the magic ratio!",
        "Want exact amounts? Tell me the recipe and I'll math it.",
        "Happy to adjust the ratios if you tell me what you're making!",
        "Need specific measurements for your recipe?",
        "Shall I calculate precise ratios for your specific application?",
        "Need measurements?",
        "I can give exact ratios if you share the recipe.",
        "Shall I adjust ratios for a specific recipe type?"
      ),
    },
    /* COMPONENTS — raw UI showcase (generic labels) */
    components: {
      sectionLabels: z(
        {buttons:"Buttons",inputs:"Type stuff",cards:"Cards",badges:"Tags & chips",alerts:"Heads up!",toggle:"On/off",code:"Code"},
        {buttons:"Buttons",inputs:"Inputs",cards:"Cards",badges:"Little Labels",alerts:"Whispers",toggle:"Toggle",code:"Code Spell"},
        {buttons:"Clicky Things",inputs:"Typey Things",cards:"Boxy Things",badges:"Labely Things",alerts:"Shouty Things",toggle:"Flippy Things",code:"Nerdy Things"},
        {buttons:"Buttons",inputs:"Inputs",cards:"Cards",badges:"Labels",alerts:"Notices",toggle:"Toggle",code:"Code"},
        {buttons:"Buttons",inputs:"Inputs",cards:"Cards",badges:"Badges & Chips",alerts:"Alerts",toggle:"Toggle",code:"Code Block"},
        {buttons:"Actions",inputs:"Form Fields",cards:"Containers",badges:"Indicators",alerts:"Notifications",toggle:"Controls",code:"Code Display"},
        {buttons:"Btn",inputs:"Input",cards:"Card",badges:"Badge",alerts:"Alert",toggle:"Toggle",code:"Code"},
        {buttons:"Buttons",inputs:"Inputs",cards:"Cards",badges:"Badges",alerts:"Alerts",toggle:"Toggle",code:"Code"},
        {buttons:"Action Elements",inputs:"Form Controls",cards:"Container Components",badges:"Status Indicators",alerts:"Notification Components",toggle:"Boolean Controls",code:"Code Display"}
      ),
      buttonLabels: z(
        [emoji?"Go! \u{1F680}":"Go!","Meh","Ghost","Yikes","Nope"],
        ["Begin","Alternate","Whisper","Undo","Resting"],
        ["Yep","Nah","Boo","Abort","Zzz"],
        ["Continue","Alternate","Subtle","Remove","Inactive"],
        ["Primary","Secondary","Ghost","Danger","Disabled"],
        ["Confirm","Secondary","Outline","Remove","Inactive"],
        ["OK","Alt","Ghost","\u2715","Off"],
        ["Submit","Secondary","Ghost","Delete","Disabled"],
        ["Submit","Secondary","Tertiary","Critical","Inactive"]
      ),
      cardTitles: z(
        ["Basic card","Fancy card","Colored card"],
        ["Story Card","Enchanted","Tinted Dream"],
        ["Plain Jane","The Fancy One","Color Bomb"],
        ["Simple Card","Highlighted","Tinted"],
        ["Default Card","Accent Card","Tinted Card"],
        ["Standard","Featured","Variant"],
        ["Card","Accent","Tint"],
        ["Default","Accent","Tinted"],
        ["Standard Container","Accent Indicator","Tinted Variant"]
      ),
      alertInfo: z(
        emoji ? "Just a heads up! \u{1F4A1}" : "Just so you know...",
        "A little something worth knowing.",
        "Fun fact: this is an info alert. Surprise!",
        "Here's something that might be helpful.",
        "This is an informational alert.",
        "Please note the following information.",
        "Info.",
        "Note: informational message.",
        "This notification provides supplementary information regarding the current operation."
      ),
      alertError: z(
        emoji ? "Uh oh, something broke! \u{1F62C}" : "Something went wrong!",
        "Oh no — something wandered off course.",
        "Well, that didn't work. Plot twist!",
        "Hmm, something didn't go as planned. Let's take a look.",
        "Something went wrong.",
        "An issue has been detected. Please review.",
        "Error.",
        "Error occurred. Check and retry.",
        "An error has occurred. Please review and take corrective action."
      ),
    },
  };
}

/* ═══════════════════════════════════════════════════════════════
   LAYER 6: ENGINE — Theming controls, randomizer, LLM, parser, export
   ═══════════════════════════════════════════════════════════════ */

const VIBE_KEYWORDS = {
  warm:{accentColor:"#E07A4F",secondaryColor:"#C0956E",backgroundColor:"#FFF8F0",vibeX:30,vibeY:25},cool:{accentColor:"#4A90D9",secondaryColor:"#6BB8C7",backgroundColor:"#F0F5FA",vibeX:60,vibeY:55},dark:{surfaceColor:"#1A1A2E",backgroundColor:"#0F0F1A",textColor:"#E2E0ED",mutedColor:"#8B8BA3",borderColor:"#2D2A42"},light:{surfaceColor:"#FFFFFF",backgroundColor:"#FAFAFA",textColor:"#1A1A1A"},moody:{accentColor:"#8B5CF6",surfaceColor:"#1E1B2E",backgroundColor:"#13111C",textColor:"#E2E0ED",borderColor:"#2D2A42",vibeX:65,vibeY:60},playful:{vibeX:15,vibeY:15,motionPreset:"bouncy",borderRadius:22},serious:{vibeX:80,vibeY:75,motionPreset:"sharp",borderRadius:6},minimal:{borderRadius:4,elevation:0,scale:"tight"},neon:{accentColor:"#39FF14",secondaryColor:"#FF00FF",surfaceColor:"#0A0A0A",backgroundColor:"#050505",textColor:"#E0FFE0",borderColor:"#1A3A1A"},pastel:{accentColor:"#B4A7D6",secondaryColor:"#A8D5BA",backgroundColor:"#FFF5F7",vibeX:30,vibeY:20},earth:{accentColor:"#8B7355",secondaryColor:"#6B8E5A",backgroundColor:"#F5F0E8",scale:"spacious"},cyber:{accentColor:"#00F0FF",secondaryColor:"#FF00AA",surfaceColor:"#0D0D1A",backgroundColor:"#060612",textColor:"#E0F0FF",borderColor:"#1A1A3A",borderRadius:6,vibeX:55,vibeY:80},cozy:{vibeX:20,vibeY:20,accentColor:"#C97B4B",backgroundColor:"#FFF8F2",scale:"relaxed"},
};
function parseVibe(input, base) {
  const words = input.toLowerCase().replace(/[^a-z\s]/g,"").split(/\s+/).filter(Boolean);
  let result = { ...base }; let matched = 0;
  for (const w of words) { if (VIBE_KEYWORDS[w]) { result = { ...result, ...VIBE_KEYWORDS[w] }; matched++; } }
  return { theme: result, matched };
}

const THEME_GEN_SYSTEM = `You are a design system architect. Generate a JSON theme: accentColor(hex), secondaryColor(hex), tertiaryColor(hex), surfaceColor(hex), backgroundColor(hex), textColor(hex), mutedColor(hex), borderColor(hex), dangerColor(hex), successColor(hex), warningColor(hex), borderRadius(0-28), scale("tight"|"default"|"relaxed"|"spacious"|"dramatic"), fontSize(12-20), vibeX(0-100), vibeY(0-100), motionPreset("none"|"smooth"|"bouncy"|"sharp"), elevation(0-4). WCAG AA contrast. Return ONLY valid JSON.`;

async function generateThemeLLM(apiKey, prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: {"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
    body: JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:512,system:THEME_GEN_SYSTEM,messages:[{role:"user",content:prompt}]})
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const match = (data.content?.[0]?.text||"").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON");
  const p = JSON.parse(match[0]);
  const cl = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  const vh = h => /^#[0-9a-fA-F]{6}$/.test(h) ? h : null;
  return {...DEFAULT_THEME, accentColor:vh(p.accentColor)||"#6E56CF", secondaryColor:vh(p.secondaryColor)||"#E5484D", tertiaryColor:vh(p.tertiaryColor)||"#3B82F6", surfaceColor:vh(p.surfaceColor)||"#FFFFFF", backgroundColor:vh(p.backgroundColor)||"#FAFAFA", textColor:vh(p.textColor)||"#1A1A1A", mutedColor:vh(p.mutedColor)||"#6B7280", borderColor:vh(p.borderColor)||"#E5E7EB", dangerColor:vh(p.dangerColor)||"#EF4444", successColor:vh(p.successColor)||"#10B981", warningColor:vh(p.warningColor)||"#F59E0B", borderRadius:cl(p.borderRadius??14,0,28), fontSize:cl(p.fontSize??15,12,20), vibeX:cl(p.vibeX??50,0,100), vibeY:cl(p.vibeY??50,0,100), motionPreset:["none","smooth","bouncy","sharp"].includes(p.motionPreset)?p.motionPreset:"smooth", elevation:cl(p.elevation??2,0,4), scale:["tight","default","relaxed","spacious","dramatic"].includes(p.scale)?p.scale:"default"};
}

/* ═══════════════════════════════════════════════
   EXPORT
   ═══════════════════════════════════════════════ */
function generateCSS(t) {
  const sc = SCALE_PRESETS[t.scale] || SCALE_PRESETS.default;
  const sp = spacingScale(sc.base, sc.harmony), ts = typeScale(t.fontSize, t.typeHarmony||"major-third");
  const bf = FONTS.find(f=>f.name===t.bodyFont)?.value||"system-ui";
  const hf = FONTS.find(f=>f.name===t.headingFont)?.value||bf;
  const mf = FONTS.find(f=>f.name===t.monoFont)?.value||"monospace";
  const voice = vibeFromMatrix(t.vibeX, t.vibeY);
  return `/* Material 3 Design System + WCAG 2.1 AA Baseline */
:root {
  --color-accent: ${t.accentColor}; --color-secondary: ${t.secondaryColor}; --color-tertiary: ${t.tertiaryColor};
  --color-surface: ${t.surfaceColor}; --color-bg: ${t.backgroundColor};
  --color-text: ${t.textColor}; --color-muted: ${t.mutedColor}; --color-border: ${t.borderColor};
  --color-danger: ${t.dangerColor}; --color-success: ${t.successColor}; --color-warning: ${t.warningColor};
  --space-3xs: ${sp["3xs"]}px; --space-2xs: ${sp["2xs"]}px; --space-xs: ${sp.xs}px;
  --space-sm: ${sp.sm}px; --space-md: ${sp.md}px; --space-lg: ${sp.lg}px;
  --space-xl: ${sp.xl}px; --space-2xl: ${sp["2xl"]}px;
  --text-xs: ${ts.xs}px; --text-sm: ${ts.sm}px; --text-base: ${ts.base}px;
  --text-md: ${ts.md}px; --text-lg: ${ts.lg}px; --text-xl: ${ts.xl}px;
  --text-2xl: ${ts["2xl"]}px; --text-display: ${ts.display}px;
  --radius: ${t.borderRadius}px;
  --font-body: ${bf}; --font-heading: ${hf}; --font-mono: ${mf};
  --transition: ${MOTION_PRESETS[t.motionPreset]?.css||"none"};
  ${Object.entries(MOTION_PRESETS[t.motionPreset]?.cssVars||{}).map(([k,v])=>`${k}: ${v};`).join("\n  ")}
  --shadow: ${elevationShadow([0,1,3][t.elevation??1], t.textColor)};
  --radius-xs: ${Math.round(t.borderRadius*0.3)}px;
  --radius-sm: ${Math.round(t.borderRadius*0.5)}px;
  --radius-md: ${t.borderRadius > 30 ? Math.min(t.borderRadius,28) : t.borderRadius}px;
  --radius-lg: ${t.borderRadius > 30 ? Math.min(Math.round(t.borderRadius*1.2),32) : Math.round(t.borderRadius*1.2)}px;
  --radius-full: 9999px;
  --border-weight: ${[0,1,2][t.borderWeight??1]}px;
  --elevation: ${["none","0 1px 2px rgba(0,0,0,0.06)","0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)"][[0,1,3][t.elevation??1]]||"none"};
  /* Icons: Google Material Symbols, style: ${t.iconStyle||"outlined"}, weight: ${t.iconWeight||400} */
  /* Voice Zone: ${getVibeZone(t.vibeX, t.vibeY)} — ${vibeLabel(t.vibeX, t.vibeY)} */
  /* Voice Definition: ${VOICE_ARCHETYPES[getVibeZone(t.vibeX, t.vibeY)]?.definition || ""} */
}`;
}
function generateJSON(t) {
  const sc = SCALE_PRESETS[t.scale]||SCALE_PRESETS.default;
  const mot = MOTION_PRESETS[t.motionPreset];
  const voice = vibeFromMatrix(t.vibeX, t.vibeY);
  const zone = getVibeZone(t.vibeX, t.vibeY);
  const archetype = VOICE_ARCHETYPES[zone] || VOICE_ARCHETYPES.Balanced;
  const baseRad = t.borderRadius;
  const radScale = {
    xs: Math.round(baseRad*0.3),
    sm: Math.round(baseRad*0.5),
    md: baseRad > 30 ? Math.min(baseRad,28) : baseRad,
    lg: baseRad > 30 ? Math.min(Math.round(baseRad*1.2),32) : Math.round(baseRad*1.2),
    full: 9999
  };
  return JSON.stringify({designSystem:{name:"Material 3",baseline:"WCAG 2.1 AA",rules:"Material Design 3 component anatomy with custom token overrides"},colors:{accent:t.accentColor,secondary:t.secondaryColor,tertiary:t.tertiaryColor,surface:t.surfaceColor,background:t.backgroundColor,text:t.textColor,muted:t.mutedColor,border:t.borderColor,danger:t.dangerColor,success:t.successColor,warning:t.warningColor},icons:{provider:"google-material-symbols",style:t.iconStyle||"outlined",weight:t.iconWeight||400,importUrl:"https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"},spacing:spacingScale(sc.base,sc.harmony),typography:{bodyFont:t.bodyFont,headingFont:t.headingFont,monoFont:t.monoFont,baseFontSize:t.fontSize,scale:typeScale(t.fontSize,sc.harmony)},shape:{baseRadius:t.borderRadius,radiusScale:radScale,elevation:t.elevation,borderWeight:t.borderWeight??1},motion:{preset:t.motionPreset,definition:mot?.definition||"",durations:mot?.durations||{},easing:mot?.easing||{}},voice:{...voice,zone,vibeLabel:vibeLabel(t.vibeX,t.vibeY),archetype:archetype.definition,traits:archetype.traits},contrast:{textOnBg:+contrastRatio(t.textColor,t.backgroundColor).toFixed(2)}},null,2);
}
function generatePrompt(t) {
  const v = vibeFromMatrix(t.vibeX, t.vibeY);
  const zone = getVibeZone(t.vibeX, t.vibeY);
  const arch = VOICE_ARCHETYPES[zone] || VOICE_ARCHETYPES.Balanced;
  const fl = v.formality < 30 ? "casual" : v.formality < 60 ? "conversational" : "formal";
  const vb = v.verbosity < 30 ? "concise" : v.verbosity < 60 ? "balanced" : "detailed";
  const sc = SCALE_PRESETS[t.scale] || SCALE_PRESETS.default;
  const sp = spacingScale(sc.base, sc.harmony);
  const ts = typeScale(t.fontSize, t.typeHarmony || "major-third");
  const mot = MOTION_PRESETS[t.motionPreset];
  const elevNames = ["Flat (no shadows)","Subtle (soft depth)","Raised (lifted feel)"];
  const bwNames = ["None","Thin (1px)","Bold (2px)"];
  const baseRad = t.borderRadius;
  return `# Design System Theme — Complete Architecture
⚠️ NOTE: This prompt describes the theme intent. For pixel-perfect accuracy,
use the JSON or CSS export alongside this prompt. The prompt alone may
produce approximations — combining Prompt + JSON file gives the best results.

## 0. Design System Baseline: Material 3 + WCAG 2.1 AA
Follow Material Design 3 guidelines for all component anatomy and interaction patterns:
- State layers: hover = +8% primary overlay, pressed = +12%, dragged = +16%
- Elevation: 5 levels (0dp–12dp) using tonal color + shadow
- Shapes: rounded rectangles with proportional "shape scale"
- Typography: display/headline/title/body/label roles with distinct weights
- Color: primary/secondary/tertiary + on-color + container + on-container roles
- Motion: emphasized (500ms) for large, standard (300ms) for small transitions
- Accessibility: WCAG 2.1 AA minimum — 4.5:1 text contrast, 3:1 UI contrast, 44px min tap targets

Apply the design tokens below as overrides to the Material 3 defaults.

## 1. Color Palette
| Token | Value | Purpose |
|-------|-------|---------|
| accent | ${t.accentColor} | Primary brand, CTAs, active states |
| secondary | ${t.secondaryColor} | Supporting brand, secondary actions |
| tertiary | ${t.tertiaryColor} | Accent variety, illustrations |
| surface | ${t.surfaceColor} | Card/panel backgrounds |
| background | ${t.backgroundColor} | Page background |
| text | ${t.textColor} | Primary body text |
| muted | ${t.mutedColor} | Secondary text, placeholders |
| border | ${t.borderColor} | Dividers, input borders |
| danger | ${t.dangerColor} | Errors, destructive actions |
| success | ${t.successColor} | Confirmations, positive states |
| warning | ${t.warningColor} | Cautions, pending states |

Color mode: ${t.colorModePolicy === "both" ? "Light + Dark" : t.colorModePolicy === "dark-only" ? "Dark only" : "Light only"}.
WCAG: text-on-background contrast is ${contrastRatio(t.textColor, t.backgroundColor).toFixed(1)}:1.

## 2. Typography
- Body font: "${t.bodyFont}" (${FONTS.find(f=>f.name===t.bodyFont)?.value||"system-ui"})
- Heading font: "${t.headingFont}" (${FONTS.find(f=>f.name===t.headingFont)?.value||"system-ui"})
- Mono font: "${t.monoFont||"JetBrains Mono"}"
- Type scale (${t.typeHarmony}, ratio ${HARMONIES[t.typeHarmony]?.ratio||1.25}):
  xs: ${ts.xs}px, sm: ${ts.sm}px, base: ${ts.base}px, md: ${ts.md}px,
  lg: ${ts.lg}px, xl: ${ts.xl}px, 2xl: ${ts["2xl"]}px, display: ${ts.display}px

## 3. Spacing Scale (${t.scale} — ${sc.name})
3xs: ${sp["3xs"]}px, 2xs: ${sp["2xs"]}px, xs: ${sp.xs}px, sm: ${sp.sm}px,
md: ${sp.md}px, lg: ${sp.lg}px, xl: ${sp.xl}px, 2xl: ${sp["2xl"]}px

## 4. Shape System
- Base border-radius: ${baseRad}px
- PROPORTIONAL SCALING (critical — do not use one flat value):
  - xs (checkboxes, dots, small icons): ${Math.round(baseRad*0.3)}px
  - sm (buttons, inputs, badges): ${Math.round(baseRad*0.5)}px
  - md (cards, panels, alerts): ${baseRad > 30 ? Math.min(baseRad,28) : baseRad}px
  - lg (modals, hero sections): ${baseRad > 30 ? Math.min(Math.round(baseRad*1.2),32) : Math.round(baseRad*1.2)}px
  - full (pills, avatars): 9999px
- Elevation: ${elevNames[t.elevation??1]}
- Border weight: ${bwNames[t.borderWeight??1]}

## 5. Motion System: ${t.motionPreset === "none" ? "Disabled" : mot?.name || t.motionPreset}
${mot?.definition || "No motion."}
${t.motionPreset !== "none" ? `
Durations: micro ${mot.durations.micro}ms, small ${mot.durations.small}ms, medium ${mot.durations.medium}ms, large ${mot.durations.large}ms.
Easings:
  default: ${mot.easing.default}
  enter: ${mot.easing.enter}
  exit: ${mot.easing.exit}

Interaction tokens:
  - Hover lift (cards): translateY(-6px) + shadow increase
  - Button hover: translateY(-3px) + glow shadow
  - Press/click: scale(0.92) squish
  - Row hover: translateX(3px) + subtle accent bg
  - Enter animation: translateY(14px) opacity 0 → 0` : ""}

## 6. Icons
Google Material Symbols — style: ${t.iconStyle||"outlined"}, weight: ${t.iconWeight||400}.
Import: <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
Usage: <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${(t.iconStyle||"outlined")==="filled"?1:0}, 'wght' ${t.iconWeight||400}">icon_name</span>

## 7. Voice & Tone: ${zone}
${arch.definition}

Traits: formality=${arch.traits.formality}, warmth=${arch.traits.warmth}, energy=${arch.traits.energy}, humor=${arch.traits.humor}, verbosity=${arch.traits.verbosity}, emoji=${arch.traits.emoji}.

Writing style: ${v.warmth>50?"Warm":"Cool"}, ${fl}, ${vb}. ${v.humor>50?"Playful":"Straightforward"} tone. ${v.energy>50?"Dynamic":"Calm"} energy. ${v.emojiDensity>30?"Uses emoji.":"No emoji."}`;
}

/* ═══════════════════════════════════════════════════════════════
   LAYER 3: ATOMS — Reusable UI primitives
   ═══════════════════════════════════════════════════════════════ */

/* ─── Stable ColorRow — defined outside so React doesn't remount on every render ─── */
function ColorRow({ k, label, theme, up, c }) {
  const bg = theme.backgroundColor;
  const fg = theme[k];
  const cr = ["backgroundColor","surfaceColor","borderColor"].includes(k)
    ? contrastRatio(fg, theme.textColor)
    : contrastRatio(fg, bg);
  const wg = wcagGrade(cr);
  const handleHex = (val) => {
    const hex = val.startsWith("#") ? val : "#" + val;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) up(k, hex);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <label style={{ position: "relative", width: 36, height: 36, borderRadius: 8, overflow: "hidden", border: `2px solid ${c.border}`, cursor: "pointer", flexShrink: 0 }}>
        <div style={{ width: "100%", height: "100%", background: theme[k] }}/>
        <input type="color" value={theme[k]} onChange={e => up(k, e.target.value)}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}/>
      </label>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: c.text }}>{label}</span>
          <span title={`${cr.toFixed(1)}:1`} style={{ fontSize: 9, fontWeight: 700, color: wg.color, background: `${wg.color}22`, borderRadius: 3, padding: "1px 5px", lineHeight: 1.3 }}>{wg.grade} {cr.toFixed(1)}</span>
        </div>
        <input type="text" value={theme[k]} onChange={e => handleHex(e.target.value)}
          style={{ width: "100%", padding: "4px 8px", fontSize: 11, fontFamily: "monospace", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 5, color: c.text, outline: "none" }}/>
      </div>
    </div>
  );
}

function ColorPicker({ theme, setTheme, up, c }) {
  const [expanded, setExpanded] = useState(false);

  /* Front: key semantic tokens */
  const frontTokens = [
    { k: "accentColor", label: "Primary" },
    { k: "secondaryColor", label: "Secondary" },
    { k: "backgroundColor", label: "Background" },
    { k: "surfaceColor", label: "Surface" },
    { k: "textColor", label: "Text" },
  ];

  /* Back: extended token groups */
  const backGroups = [
    { title: "Extended Palette", tokens: [
      { k: "tertiaryColor", label: "Tertiary" },
      { k: "mutedColor", label: "Muted Text" },
      { k: "borderColor", label: "Border" },
    ]},
    { title: "Feedback", tokens: [
      { k: "dangerColor", label: "Danger" },
      { k: "successColor", label: "Success" },
      { k: "warningColor", label: "Warning" },
    ]},
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {frontTokens.map(t => <ColorRow key={t.k} {...t} theme={theme} up={up} c={c}/>)}

      <button onClick={() => setExpanded(!expanded)} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "8px", borderRadius: 6, border: `1px solid ${c.border}`,
        background: expanded ? `${c.accent}11` : "transparent",
        color: c.muted, fontSize: 11, fontWeight: 600, cursor: "pointer",
        transition: "all 0.15s ease",
      }}>
        {expanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
        {expanded ? "Hide" : "Show"} Extended Tokens
      </button>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "10px 0 0" }}>
          {backGroups.map(g => (
            <div key={g.title}>
              <div style={{ fontSize: 10, fontWeight: 700, color: c.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{g.title}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.tokens.map(t => <ColorRow key={t.k} {...t} theme={theme} up={up} c={c}/>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Dropdown({ value, options, onChange, c, style: es }) {
  return (<select value={value} onChange={e=>onChange(e.target.value)}
    style={{padding:"10px 12px",borderRadius:7,border:`1px solid ${c.border}`,background:c.bg,color:c.text,fontSize:14,cursor:"pointer",outline:"none",width:"100%",...es}}>
    {options.map(o => <option key={o.value||o} value={o.value||o} style={{fontFamily:o.fontFamily}}>{o.label||o}</option>)}
  </select>);
}

/* Font picker with live preview — each option rendered in its own font */
function FontPicker({ value, onChange, c, fonts }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = fonts.find(f => f.name === value) || fonts[0];
  // Load all fonts on first open
  useEffect(() => { if (open) fonts.forEach(f => loadFont(f.name)); }, [open]);
  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 7, border: `1px solid ${c.border}`, background: c.bg, color: c.text, fontSize: 14, cursor: "pointer", textAlign: "left", fontFamily: current.value, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{current.name}</span>
        <ChevronDown size={14} style={{ color: c.muted, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}/>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 7, maxHeight: 280, overflowY: "auto", marginTop: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
          {["sans","serif","mono","display"].map(cat => {
            const group = fonts.filter(f => f.cat === cat);
            if (!group.length) return null;
            return (
              <div key={cat}>
                <div style={{ fontSize: 10, fontWeight: 700, color: c.muted, textTransform: "uppercase", letterSpacing: 1, padding: "8px 12px 4px", position: "sticky", top: 0, background: c.surface }}>
                  {cat === "sans" ? "Sans Serif" : cat === "serif" ? "Serif" : cat === "mono" ? "Monospace" : "Display"}
                </div>
                {group.map(f => (
                  <button key={f.name} onClick={() => { loadFont(f.name); onChange(f.name); setOpen(false); }}
                    style={{ width: "100%", padding: "8px 12px", border: "none", background: value === f.name ? `${c.accent}22` : "transparent", color: value === f.name ? c.accent : c.text, fontSize: 15, fontFamily: f.value, cursor: "pointer", textAlign: "left", display: "block" }}>
                    {f.name}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CopyBtn({ text, c }) {
  const [ok, set] = useState(false);
  return (<button onClick={()=>{navigator.clipboard.writeText(text).then(()=>{set(true);setTimeout(()=>set(false),2000)})}}
    style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:6,border:`1px solid ${c.border}`,background:c.surface,color:ok?"#10B981":c.text,fontSize:13,cursor:"pointer"}}>
    {ok?<Check size={14}/>:<Copy size={14}/>}{ok?"Copied":"Copy"}
  </button>);
}

function Hoverable({ children, style, hoverStyle, pressStyle, onClick, mt, motionCss }) {
  const [h, setH] = useState(false);
  const [p, setP] = useState(false);
  // mt = motion token transition string (e.g. m.sm, m.md), falls back to motionCss for compat
  const tr = mt || motionCss || "all 0.15s";
  return (<div
    onMouseEnter={()=>setH(true)} onMouseLeave={()=>{setH(false);setP(false);}}
    onMouseDown={pressStyle?()=>setP(true):undefined} onMouseUp={pressStyle?()=>setP(false):undefined}
    onClick={onClick}
    style={{transition:tr,...style,...(h?hoverStyle:{}),...(p?pressStyle:{})}}>{children}</div>);
}

/* Extracted reusable atom components for previews and templates */
function Btn({ label, isPrimary, isSecondary, isDanger, isGhost, disabled, t, m, sp, ts, bodyFF, bw=1, onClick, sh }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const borderStr = bw === 0 ? "none" : `${bw}px solid ${isDanger?t.dangerColor:t.borderColor}`;
  const baseBg = isPrimary?t.accentColor:isSecondary?t.surfaceColor:isDanger?t.dangerColor:isGhost?t.backgroundColor:t.backgroundColor;
  return (
    <button disabled={disabled} onClick={onClick}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>{setHovered(false);setPressed(false);}}
      onMouseDown={()=>setPressed(true)} onMouseUp={()=>setPressed(false)}
      style={{padding:`${sp["2xs"]}px ${sp.sm}px`,borderRadius:Math.round((t.borderRadius||8)*0.5),border:isPrimary?"none":borderStr,background:baseBg,color:isPrimary?"#fff":isDanger?"#fff":t.textColor,fontSize:ts.sm,fontWeight:600,cursor:disabled?"default":"pointer",opacity:disabled?0.6:pressed?0.75:1,transition:m.sm,fontFamily:bodyFF,boxShadow:sh||"none",filter:hovered&&!disabled?"brightness(1.1)":"none"}}>
      {label}
    </button>
  );
}

function Badge({ label, color, filled, onClick, m }) {
  return (
    <span onClick={onClick} style={{fontSize:12,fontWeight:600,padding:"6px 10px",borderRadius:9999,background:filled?color:"transparent",color:filled?"#fff":color,border:filled?"none":`1px solid ${color}`,cursor:"pointer",transition:m.micro}}>
      {label}
    </span>
  );
}

function Alert({ title, msg, color, t, sp, ts, bodyFF, onDismiss, m, rad }) {
  const r = rad ? rad.md : Math.round((t.borderRadius || 8) * 0.8);
  return (
    <div style={{padding:sp.sm,borderRadius:r,border:`1px solid ${color}44`,background:`${color}11`,color:t.textColor,fontSize:ts.sm,fontFamily:bodyFF,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <div style={{fontWeight:700,color,marginBottom:4}}>{title}</div>
        <div style={{color:t.mutedColor}}>{msg}</div>
      </div>
      {onDismiss&&<button onClick={onDismiss} style={{background:"none",border:"none",color:t.mutedColor,fontSize:18,cursor:"pointer",padding:0,marginLeft:sp.sm,flexShrink:0}}>×</button>}
    </div>
  );
}

function CardShell({ children, t, sp, m, accent, tinted, expanded, onClick, rad }) {
  const r = rad ? rad.md : (t.borderRadius || 8);
  return (
    <div onClick={onClick}
      style={{padding:sp.md,borderRadius:r,border:`1px solid ${accent?t.accentColor:tinted?t.borderColor:t.borderColor}`,background:tinted?`${t.accentColor}11`:t.surfaceColor,cursor:"pointer",transition:m.md,...(expanded?{boxShadow:`0 10px 30px rgba(0,0,0,0.1)`}:{})}}>
      {children}
    </div>
  );
}

function ToggleSwitch({ value, onChange, t, m }) {
  return (
    <button onClick={()=>onChange(!value)}
      style={{width:44,height:24,borderRadius:9999,border:"none",background:value?t.accentColor:t.borderColor,position:"relative",cursor:"pointer",transition:m.sm}}>
      <div style={{position:"absolute",top:2,left:value?20:2,width:20,height:20,background:"#fff",borderRadius:"50%",transition:m.micro}}/>
    </button>
  );
}

function TextInput({ placeholder, t, sp, ts, bodyFF, m, type, ...rest }) {
  return (
    <input type={type||"text"} placeholder={placeholder}
      style={{padding:`${sp["2xs"]}px ${sp.xs}px`,borderRadius:Math.round((t.borderRadius||8)*0.5),border:`1px solid ${t.borderColor}`,background:t.backgroundColor,color:t.textColor,fontSize:ts.sm,fontFamily:bodyFF,outline:"none",transition:m.micro}}
      {...rest}/>
  );
}

/* Material Symbol — renders a Google Material Symbol that adapts to theme icon settings */
function MIcon({ name, size = 20, color, t, style: es }) {
  const fill = (t.iconStyle || "outlined") === "filled" ? 1 : 0;
  const wght = t.iconWeight || 400;
  return (
    <span className="material-symbols-outlined" style={{
      fontSize: size, color, lineHeight: 1,
      fontVariationSettings: `'FILL' ${fill}, 'wght' ${wght}, 'opsz' ${Math.min(48, Math.max(20, size))}`,
      ...es
    }}>{name}</span>
  );
}

/* ── New atoms (Layer 3b) ─────────────────────────────────── */

function Avatar({ name, size = 36, src, t, rad }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const s = size;
  const bg = t.accentColor;
  return (
    <div style={{width:s,height:s,borderRadius:rad?.full||9999,background:src?"transparent":bg,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(s*0.38),fontWeight:700,overflow:"hidden",flexShrink:0}}>
      {src ? <img src={src} alt={name} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : initials}
    </div>
  );
}

function AvatarStack({ names, max = 4, size = 32, t, rad, ts }) {
  const show = names.slice(0, max);
  const extra = names.length - max;
  return (
    <div style={{display:"flex",alignItems:"center"}}>
      {show.map((n, i) => <div key={i} style={{marginLeft:i?-Math.round(size*0.3):0,zIndex:max-i,border:`2px solid ${t.backgroundColor}`,borderRadius:rad?.full||9999}}><Avatar name={n} size={size} t={t} rad={rad}/></div>)}
      {extra > 0 && <span style={{marginLeft:6,fontSize:ts?.xs||12,color:t.mutedColor,fontWeight:600}}>+{extra}</span>}
    </div>
  );
}

function ProgressBar({ value = 50, color, t, rad, height = 8 }) {
  const bg = alpha(color || t.accentColor, 0.15);
  const fill = color || t.accentColor;
  return (
    <div style={{width:"100%",height,borderRadius:rad?.full||9999,background:bg,overflow:"hidden"}}>
      <div style={{width:`${Math.min(100,Math.max(0,value))}%`,height:"100%",borderRadius:rad?.full||9999,background:fill,transition:"width 0.4s ease"}}/>
    </div>
  );
}

function Skeleton({ width = "100%", height = 16, rounded, t, rad }) {
  return (
    <div style={{width,height,borderRadius:rounded?rad?.full||9999:rad?.sm||4,background:alpha(t.mutedColor,0.15),animation:"skeleton-pulse 1.5s ease-in-out infinite"}}>
      <style>{`@keyframes skeleton-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

function TabBar({ tabs, active, onChange, t, ts, sp, m }) {
  return (
    <div style={{display:"flex",gap:sp?.sm||12,borderBottom:`1px solid ${t.borderColor}`,overflow:"auto"}}>
      {tabs.map((tab, i) => (
        <button key={i} onClick={() => onChange(i)} style={{padding:`${sp?.xs||8}px ${sp?.sm||12}px`,background:"none",border:"none",borderBottom:`2px solid ${i===active?t.accentColor:"transparent"}`,color:i===active?t.accentColor:t.mutedColor,fontSize:ts?.sm||14,fontWeight:i===active?700:500,cursor:"pointer",transition:m?.micro||"all 0.1s",whiteSpace:"nowrap"}}>
          {tab}
        </button>
      ))}
    </div>
  );
}

function Breadcrumbs({ items, t, ts, sp }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:sp?.["2xs"]||6,fontSize:ts?.xs||12,flexWrap:"wrap"}}>
      {items.map((item, i) => (
        <span key={i} style={{display:"inline-flex",alignItems:"center",gap:sp?.["2xs"]||6}}>
          {i > 0 && <ChevronDown size={10} style={{color:t.mutedColor,transform:"rotate(-90deg)",flexShrink:0}}/>}
          <span style={{color:i===items.length-1?t.textColor:t.mutedColor,fontWeight:i===items.length-1?600:400,cursor:i<items.length-1?"pointer":"default"}}>{item}</span>
        </span>
      ))}
    </div>
  );
}

function StarRating({ rating = 4, max = 5, size = 16, color, t }) {
  const c = color || t.accentColor;
  return (
    <div style={{display:"flex",gap:2}}>
      {Array.from({length:max},(_,i) => (
        <MIcon key={i} name={i<Math.floor(rating)?"star":i<rating?"star_half":"star"} size={size} color={i<rating?c:alpha(t.mutedColor,0.3)} t={t} style={{fontVariationSettings:`'FILL' ${i<Math.floor(rating)?1:0}, 'wght' 400, 'opsz' ${size}`}}/>
      ))}
    </div>
  );
}

function SectionDivider({ label, t, ts, sp }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:sp?.sm||12,padding:`${sp?.xs||8}px 0`}}>
      <div style={{flex:1,height:1,background:t.borderColor}}/>
      {label && <span style={{fontSize:ts?.xs||11,color:t.mutedColor,fontWeight:600,textTransform:"uppercase",letterSpacing:1,whiteSpace:"nowrap"}}>{label}</span>}
      <div style={{flex:1,height:1,background:t.borderColor}}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LAYER 4: CONTENT — Voice & vibe system
   ═══════════════════════════════════════════════════════════════ */

/* VIBE MATRIX — 2D drag pad layout info */
/* 3×3 zone labels for the vibe matrix */
const VIBE_ZONES = [
  ["Bubbly","Whimsical","Quirky"],
  ["Warm","Balanced","Poised"],
  ["Chill","Grounded","Corporate"],
];

/* useThemeTokens — computed token hook for all templates */
function useThemeTokens(t) {
  return useMemo(() => {
    const sc = SCALE_PRESETS[t.scale] || SCALE_PRESETS.default;
    const sp = spacingScale(sc.base, sc.harmony);
    const ts = typeScale(t.fontSize, t.typeHarmony || "major-third");
    const bodyFF = FONTS.find(f => f.name === t.bodyFont)?.value || "system-ui, sans-serif";
    const headFF = FONTS.find(f => f.name === t.headingFont)?.value || bodyFF;
    const monoFF = FONTS.find(f => f.name === t.monoFont)?.value || "monospace";
    // Elevation: 0=flat, 1=subtle, 2=raised — maps to shadow levels
    const elevMap = [0, 1, 3];
    const elevLevel = elevMap[t.elevation ?? 1] ?? 1;
    const sh = elevationShadow(elevLevel, t.textColor);
    // Proportional border-radius: base value scales by element size
    // Small (badges, inputs) get proportional. Large (cards, modals) get capped.
    // "pill" (99) becomes proportional too — small elements fully round, large ones just very rounded
    const baseRad = t.borderRadius;
    const rad = {
      xs: Math.round(baseRad * 0.3),           // tiny elements: checkboxes, color dots
      sm: Math.round(baseRad * 0.5),           // inputs, buttons, badges
      md: baseRad,                              // cards, alerts, containers
      lg: Math.round(baseRad * 1.2),           // modals, hero sections
      full: 9999,                               // pills, avatar circles
    };
    // Cap large-element radius so "pill" (99) doesn't make cards into ovals
    if (baseRad > 30) {
      rad.md = Math.min(baseRad, 28);
      rad.lg = Math.min(Math.round(baseRad * 1.2), 32);
    }
    // borderWeight: 0=none, 1=thin(1px), 2=bold(2px)
    const bw = [0, 1, 2][t.borderWeight ?? 1];
    const bdr = bw === 0 ? "none" : `${bw}px solid ${t.borderColor}`;
    const bdrAccent = bw === 0 ? "none" : `${bw}px solid ${t.accentColor}`;
    // Accent-colored shadow that still respects elevation level
    const shAccent = elevLevel === 0 ? "none" : elevLevel === 1 ? `0 2px 8px ${alpha(t.accentColor,0.2)}` : `0 4px 16px ${alpha(t.accentColor,0.25)}`;
    const voice = vibeFromMatrix(t.vibeX, t.vibeY);
    const zone = getVibeZone(t.vibeX, t.vibeY);
    const content = getVibeContent(voice, t.vibeX, t.vibeY);
    return { sc, sp, ts, bodyFF, headFF, monoFF, sh, shAccent, rad, bw, bdr, bdrAccent, voice, zone, content, elevLevel };
  }, [t.scale, t.fontSize, t.typeHarmony, t.bodyFont, t.headingFont, t.monoFont, t.elevation, t.textColor, t.borderRadius, t.borderWeight, t.vibeX, t.vibeY]);
}

/* ═══════════════════════════════════════════════════════════════
   LAYER 5: TEMPLATES — Preview compositions
   ═══════════════════════════════════════════════════════════════ */

function VibeMatrix({ x, y, onChangeX, onChangeY, c }) {
  const padRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleMove = useCallback((e) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const nx = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
    const ny = Math.max(0, Math.min(100, Math.round(((clientY - rect.top) / rect.height) * 100)));
    onChangeX(nx); onChangeY(ny);
  }, [onChangeX, onChangeY]);

  const startDrag = useCallback((e) => {
    setDragging(true); handleMove(e);
  }, [handleMove]);

  useEffect(() => {
    if (!dragging) return;
    const move = e => { e.preventDefault(); handleMove(e); };
    const up = () => setDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, {passive:false});
    window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); window.removeEventListener("touchmove", move); window.removeEventListener("touchend", up); };
  }, [dragging, handleMove]);

  const voice = vibeFromMatrix(x, y);
  const zoneCol = x < 33 ? 0 : x < 66 ? 1 : 2;
  const zoneRow = y < 33 ? 0 : y < 66 ? 1 : 2;
  const zoneName = VIBE_ZONES[zoneRow][zoneCol];

  return (
    <div>
      <div style={{fontSize:14,fontWeight:600,color:c.text,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>Voice & Vibe</span>
        <span style={{fontWeight:500,color:c.accent,fontSize:13}}>{zoneName}</span>
      </div>
      <div ref={padRef} onMouseDown={startDrag} onTouchStart={startDrag}
        style={{position:"relative",width:"100%",height:180,borderRadius:8,border:`1px solid ${c.border}`,background:c.bg,cursor:"crosshair",touchAction:"none",overflow:"hidden"}}>
        {/* Scale grid lines */}
        {[1,2].map(i=><div key={`vl${i}`} style={{position:"absolute",left:`${i*33.33}%`,top:0,bottom:0,width:1,background:`${c.border}33`,pointerEvents:"none"}}/>)}
        {[1,2].map(i=><div key={`hl${i}`} style={{position:"absolute",top:`${i*33.33}%`,left:0,right:0,height:1,background:`${c.border}33`,pointerEvents:"none"}}/>)}
        {/* Axis labels */}
        <span style={{position:"absolute",bottom:3,left:"50%",transform:"translateX(-50%)",fontSize:9,color:c.muted,fontWeight:600,letterSpacing:1}}>FRIENDLY → FORMAL</span>
        <span style={{position:"absolute",top:"50%",left:3,transform:"rotate(-90deg) translateX(-50%)",transformOrigin:"0 0",fontSize:9,color:c.muted,fontWeight:600,letterSpacing:1,whiteSpace:"nowrap"}}>PLAYFUL → SERIOUS</span>
        {/* Crosshairs */}
        <div style={{position:"absolute",left:`${x}%`,top:0,bottom:0,width:1,background:`${c.accent}33`,transition:dragging?"none":"all 0.1s"}}/>
        <div style={{position:"absolute",top:`${y}%`,left:0,right:0,height:1,background:`${c.accent}33`,transition:dragging?"none":"all 0.1s"}}/>
        {/* Dot */}
        <div style={{position:"absolute",left:`${x}%`,top:`${y}%`,transform:"translate(-50%,-50%)",width:18,height:18,borderRadius:"50%",background:c.accent,border:"2px solid #fff",boxShadow:`0 2px 8px ${alpha(c.accent,0.5)}`,transition:dragging?"none":"all 0.1s",zIndex:2,pointerEvents:"none"}}/>
      </div>
      {/* Voice values computed internally — drives vibeFromMatrix, getVibeContent, and exports */}
    </div>
  );
}

/* Template: ThemePalette */
function ThemePalette({ t }) {
  const tk = useThemeTokens(t);
  const { sp, ts, bodyFF, headFF, monoFF, bdr, sh, rad } = tk;
  const m = useMotion(t);
  const maxSp = Math.max(...Object.values(sp));
  const voice = vibeFromMatrix(t.vibeX, t.vibeY);
  return (
    <div style={{background:t.surfaceColor,border:bdr,borderRadius:rad.md,padding:sp.md,marginBottom:sp.md,boxShadow:sh,transition:m.md}}>
      <div style={{display:"flex",gap:sp.md,flexWrap:"wrap",marginBottom:sp.sm}}>
        <div style={{flex:"1 1 140px"}}>
          <div style={{fontSize:ts.xs,fontWeight:600,color:t.mutedColor,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Palette</div>
          <div style={{display:"flex",gap:3}}>
            {[t.accentColor,t.secondaryColor,t.surfaceColor,t.backgroundColor,t.textColor,t.mutedColor,t.borderColor,t.dangerColor,t.successColor,t.warningColor].map((col,i)=>(
              <div key={i} style={{width:20,height:20,borderRadius:rad.xs,background:col,border:`1px solid ${t.borderColor}`}} title={col}/>
            ))}
          </div>
        </div>
        <div style={{flex:"1 1 180px"}}>
          <div style={{fontSize:ts.xs,fontWeight:600,color:t.mutedColor,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Type Scale</div>
          <div style={{display:"flex",alignItems:"baseline",gap:4,flexWrap:"wrap"}}>
            <span style={{fontFamily:headFF,fontSize:ts.xl,fontWeight:700,color:t.textColor,lineHeight:1}}>Aa</span>
            <span style={{fontFamily:bodyFF,fontSize:ts.md,fontWeight:500,color:t.textColor}}>Aa</span>
            <span style={{fontFamily:bodyFF,fontSize:ts.base,color:t.mutedColor}}>Aa</span>
            <span style={{fontFamily:bodyFF,fontSize:ts.sm,color:t.mutedColor}}>Aa</span>
          </div>
          <div style={{fontSize:ts.xs,color:t.mutedColor,marginTop:2}}>{t.headingFont} + {t.bodyFont}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:2,alignItems:"flex-end",height:36,marginBottom:sp.xs}}>
        {Object.entries(sp).map(([k,v])=>(
          <div key={k} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,flex:1}}>
            <div style={{width:"100%",maxWidth:24,height:Math.max(2,(v/maxSp)*32),borderRadius:2,background:`linear-gradient(180deg, ${t.accentColor}, ${lighten(t.accentColor,0.5)})`,transition:m.sm}}/>
            <span style={{fontSize:6,color:t.mutedColor,fontFamily:"monospace"}}>{k}</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:sp.sm,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{width:28,height:28,border:`2px solid ${t.accentColor}`,borderRadius:rad.sm,background:alpha(t.accentColor,0.08)}}/>
        <div style={{width:28,height:28,borderRadius:rad.sm,background:t.surfaceColor,border:`1px solid ${t.borderColor}`,boxShadow:elevationShadow(t.elevation,t.textColor),display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:ts.xs,fontWeight:700,color:t.accentColor}}>{t.elevation}</span>
        </div>
        <div style={{display:"flex",gap:3,flexWrap:"wrap",flex:1}}>
          {[{l:voice.warmth>50?"Warm":"Cool"},{l:voice.formality>50?"Formal":"Casual"},{l:voice.humor>50?"Fun":"Steady"},{l:voice.energy>50?"Dynamic":"Calm"}].map(tag=>(
            <span key={tag.l} style={{fontSize:8,fontWeight:500,padding:"2px 5px",borderRadius:9999,background:lighten(t.accentColor,0.88),color:darken(t.accentColor,0.15)}}>{tag.l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Template: ComponentShowcase */
function ComponentShowcase({ t }) {
  const tk = useThemeTokens(t);
  const { sp, ts, bodyFF, headFF, monoFF, bdr, bdrAccent, bw, sh, shAccent, rad } = tk;
  const m = useMotion(t);
  const vc = tk.content.components;
  const [toggle, setToggle] = useState(true);
  const [check, setCheck] = useState(true);
  const [badgeStyles, setBadgeStyles] = useState({0:true, 1:true, 2:true, 3:true});
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [expandedCard, setExpandedCard] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  return (
    <div style={{fontSize:ts.base,color:t.textColor,fontFamily:bodyFF,background:t.backgroundColor,minHeight:"100vh",padding:sp.lg,display:"flex",flexDirection:"column",gap:sp.xl}}>
      <div>
        <h2 style={{fontSize:ts["2xl"],fontWeight:800,marginBottom:sp.md,fontFamily:headFF}}>Component System</h2>
        <p style={{color:t.mutedColor}}>All components using the theme colors and scales</p>
      </div>

      {/* Atoms - Buttons */}
      <div>
        <h3 style={{fontSize:ts.lg,fontWeight:700,marginBottom:sp.md,fontFamily:headFF}}>Buttons</h3>
        <div style={{display:"flex",gap:sp.sm,flexWrap:"wrap",background:t.surfaceColor,padding:sp.md,borderRadius:rad.md,border:bdr,boxShadow:sh}}>
          <Btn label={vc.buttonLabels[0]} isPrimary t={t} m={m} sp={sp} ts={ts} bodyFF={bodyFF} bw={bw} sh={shAccent}/>
          <Btn label={vc.buttonLabels[1]} isSecondary t={t} m={m} sp={sp} ts={ts} bodyFF={bodyFF} bw={bw} sh={sh}/>
          <Btn label={vc.buttonLabels[2]} t={t} m={m} sp={sp} ts={ts} bodyFF={bodyFF} bw={bw} sh={sh}/>
          <Btn label={vc.buttonLabels[3]} isDanger t={t} m={m} sp={sp} ts={ts} bodyFF={bodyFF} bw={bw} sh={sh}/>
          <Btn label={vc.buttonLabels[4]} disabled t={t} m={m} sp={sp} ts={ts} bodyFF={bodyFF} bw={bw} sh={sh}/>
        </div>
      </div>

      {/* Atoms - Inputs */}
      <div>
        <h3 style={{fontSize:ts.lg,fontWeight:700,marginBottom:sp.md,fontFamily:headFF}}>Inputs & Controls</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:sp.sm,background:t.surfaceColor,padding:sp.md,borderRadius:rad.md,border:bdr,boxShadow:sh}}>
          <input type="text" placeholder="Text input..." style={{padding:`${sp["2xs"]}px ${sp.xs}px`,borderRadius:rad.sm,border:bdr,background:t.backgroundColor,color:t.textColor,fontSize:ts.sm,fontFamily:bodyFF,transition:m.sm,boxShadow:elevationShadow(Math.max(0,t.elevation-1),t.textColor)}}/>
          <input type="search" placeholder="Search..." style={{padding:`${sp["2xs"]}px ${sp.xs}px`,borderRadius:rad.sm,border:bdr,background:t.backgroundColor,color:t.textColor,fontSize:ts.sm,fontFamily:bodyFF,transition:m.sm,boxShadow:elevationShadow(Math.max(0,t.elevation-1),t.textColor)}}/>
          <div style={{display:"flex",alignItems:"center",gap:sp.xs}}>
            <input type="checkbox" checked={check} onChange={e=>setCheck(e.target.checked)} style={{width:18,height:18,accentColor:t.accentColor}}/>
            <label style={{fontSize:ts.sm}}>Checkbox</label>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:sp.xs}}>
            <input type="radio" name="demo" style={{accentColor:t.accentColor}}/>
            <label style={{fontSize:ts.sm}}>Radio</label>
          </div>
        </div>
      </div>

      {/* Atoms - Badges */}
      <div>
        <h3 style={{fontSize:ts.lg,fontWeight:700,marginBottom:sp.md,fontFamily:headFF}}>Badges & Tags</h3>
        <div style={{display:"flex",gap:sp.sm,flexWrap:"wrap",background:t.surfaceColor,padding:sp.md,borderRadius:rad.md,border:bdr,boxShadow:sh}}>
          <Badge label="Default" color={t.accentColor} filled={badgeStyles[0]} onClick={()=>setBadgeStyles({...badgeStyles,0:!badgeStyles[0]})} m={m}/>
          <Badge label="Success" color={t.successColor} filled={badgeStyles[1]} onClick={()=>setBadgeStyles({...badgeStyles,1:!badgeStyles[1]})} m={m}/>
          <Badge label="Warning" color={t.warningColor} filled={badgeStyles[2]} onClick={()=>setBadgeStyles({...badgeStyles,2:!badgeStyles[2]})} m={m}/>
          <Badge label="Danger" color={t.dangerColor} filled={badgeStyles[3]} onClick={()=>setBadgeStyles({...badgeStyles,3:!badgeStyles[3]})} m={m}/>
        </div>
      </div>

      {/* Molecules - Alerts */}
      <div>
        <h3 style={{fontSize:ts.lg,fontWeight:700,marginBottom:sp.md,fontFamily:headFF}}>Alerts</h3>
        <div style={{display:"flex",flexDirection:"column",gap:sp.sm,background:t.surfaceColor,padding:sp.md,borderRadius:rad.md,border:bdr,boxShadow:sh}}>
          {!dismissedAlerts.has(0)&&<Alert title="Information" msg={vc.alertInfo} color={t.accentColor} t={t} sp={sp} ts={ts} bodyFF={bodyFF} rad={rad} onDismiss={()=>setDismissedAlerts(new Set([...dismissedAlerts,0]))} m={m}/>}
          {!dismissedAlerts.has(1)&&<Alert title="Success" msg="Your changes have been saved successfully." color={t.successColor} t={t} sp={sp} ts={ts} bodyFF={bodyFF} rad={rad} onDismiss={()=>setDismissedAlerts(new Set([...dismissedAlerts,1]))} m={m}/>}
          {!dismissedAlerts.has(2)&&<Alert title="Warning" msg="Please review before proceeding." color={t.warningColor} t={t} sp={sp} ts={ts} bodyFF={bodyFF} rad={rad} onDismiss={()=>setDismissedAlerts(new Set([...dismissedAlerts,2]))} m={m}/>}
          {!dismissedAlerts.has(3)&&<Alert title="Error" msg={vc.alertError} color={t.dangerColor} t={t} sp={sp} ts={ts} bodyFF={bodyFF} rad={rad} onDismiss={()=>setDismissedAlerts(new Set([...dismissedAlerts,3]))} m={m}/>}
        </div>
      </div>

      {/* Molecules - Cards */}
      <div>
        <h3 style={{fontSize:ts.lg,fontWeight:700,marginBottom:sp.md,fontFamily:headFF}}>Cards</h3>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:sp.sm}}>
          {[0,1,2].map(i=>{
            const isExp = expandedCard === i;
            const cardConfigs = [
              {bg:t.surfaceColor,border:bdr,borderCol:t.borderColor,title:vc.cardTitles[0],desc:"Standard card with border",detail:"Click to expand and see more details about this card component."},
              {bg:lighten(t.accentColor,0.9),border:bdrAccent,borderCol:t.accentColor,title:vc.cardTitles[1],desc:"With accent border",detail:"This card has an accent border that really makes it pop!"},
              {bg:alpha(t.accentColor,0.1),border:bdr,borderCol:t.borderColor,title:vc.cardTitles[2],desc:"Tinted background",detail:"The background has a subtle tint from the accent color."}
            ];
            const cfg = cardConfigs[i];
            return (
              <div key={i} onClick={()=>setExpandedCard(isExp?null:i)} style={{background:cfg.bg,padding:sp.md,borderRadius:rad.md,border:cfg.border,boxShadow:sh,cursor:"pointer",transition:m.md,...(isExp?m.expand:{})}}>
                <div style={{fontWeight:700,marginBottom:sp.xs}}>{cfg.title}</div>
                <p style={{color:t.mutedColor,fontSize:ts.sm,marginTop:0,marginBottom:0}}>{cfg.desc}</p>
                {isExp&&<p style={{color:t.mutedColor,fontSize:ts.sm,marginTop:sp.xs,marginBottom:0,paddingTop:sp.xs,borderTop:`${bw||1}px solid ${cfg.borderCol}44`}}>{cfg.detail}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Atoms - Toggle */}
      <div>
        <h3 style={{fontSize:ts.lg,fontWeight:700,marginBottom:sp.md,fontFamily:headFF}}>Toggle</h3>
        <div style={{background:t.surfaceColor,padding:sp.md,borderRadius:rad.md,border:bdr,boxShadow:sh,display:"flex",alignItems:"center",gap:sp.sm}}>
          <div onClick={()=>setToggle(!toggle)} style={{width:48,height:28,borderRadius:14,background:toggle?t.accentColor:t.borderColor,cursor:"pointer",display:"flex",alignItems:"center",padding:"2px 4px",transition:m.sm}}>
            <div style={{width:24,height:24,borderRadius:12,background:"#fff",transform:toggle?"translateX(20px)":"translateX(0)",transition:m.sm}}/>
          </div>
          <span>{toggle?"On":"Off"}</span>
        </div>
      </div>

      {/* Organisms - Data Table */}
      <div>
        <h3 style={{fontSize:ts.lg,fontWeight:700,marginBottom:sp.md,fontFamily:headFF}}>Data Table</h3>
        <div style={{overflowX:"auto",background:t.surfaceColor,borderRadius:rad.md,border:bdr,boxShadow:sh}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontFamily:bodyFF}}>
            <thead>
              <tr style={{borderBottom:`${Math.max(bw,1)*2}px solid ${t.borderColor}`,background:t.backgroundColor}}>
                <th style={{padding:sp.xs,textAlign:"left",fontWeight:700,color:t.textColor}}>Item</th>
                <th style={{padding:sp.xs,textAlign:"left",fontWeight:700,color:t.textColor}}>Status</th>
                <th style={{padding:sp.xs,textAlign:"right",fontWeight:700,color:t.textColor}}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {[{n:"Entry 1",s:"Done",a:"$1,234"},{n:"Entry 2",s:"Active",a:"$5,678"},{n:"Entry 3",s:"Pending",a:"$910"}].map((row,i)=>(
                <tr key={i} onClick={()=>setSelectedRow(selectedRow===i?null:i)} style={{borderBottom:bw===0?"none":`${bw}px solid ${t.borderColor}`,background:selectedRow===i?alpha(t.accentColor,0.08):undefined,cursor:"pointer",transition:m.sm,...(selectedRow===i?m.selected:{})}}>
                  <td style={{padding:sp.xs,color:t.textColor}}>{row.n}</td>
                  <td style={{padding:sp.xs}}><Badge label={row.s} color={row.s==="Done"?t.successColor:row.s==="Active"?t.accentColor:t.warningColor} m={m}/></td>
                  <td style={{padding:sp.xs,textAlign:"right",color:t.textColor}}>{row.a}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Organisms - Code Block */}
      <div>
        <h3 style={{fontSize:ts.lg,fontWeight:700,marginBottom:sp.md,fontFamily:headFF}}>Code</h3>
        <pre style={{background:t.backgroundColor,border:bdr,borderRadius:rad.md,padding:sp.md,overflow:"auto",fontSize:ts.sm,fontFamily:monoFF,color:t.textColor,marginTop:0,marginBottom:0,boxShadow:sh}}>
{`const theme = {
  accent: "${t.accentColor}",
  secondary: "${t.secondaryColor}"
}`}
        </pre>
      </div>
    </div>
  );
}

/* Template: LandingPreview */
function LandingPreview({ t, w = 1024 }) {
  const tk = useThemeTokens(t);
  const { sp, ts, bodyFF, headFF, bdr, bdrAccent, bw, sh, shAccent, rad } = tk;
  const m = useMotion(t);
  const voice = vibeFromMatrix(t.vibeX, t.vibeY);
  const vc = getVibeContent(voice, t.vibeX, t.vibeY).landing;
  const icons = [<MIcon name="layers" size={18} color="currentColor" t={t}/>,<MIcon name="bolt" size={18} color="currentColor" t={t}/>,<MIcon name="group" size={18} color="currentColor" t={t}/>];
  const [openFaq, setOpenFaq] = useState(null);
  const [selectedNav, setSelectedNav] = useState(0);
  const [heroPressed, setHeroPressed] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const mob = w < 700;
  const contentPad = mob ? "0 24px" : `0 clamp(8px, 3vw, ${sp.md}px)`;

  return (
    <div style={{fontSize:ts.base,color:t.textColor,fontFamily:bodyFF,background:t.backgroundColor,minHeight:"100vh"}}>

      {/* ─── NAV ─── */}
      <div style={{position:"sticky",top:0,zIndex:10,background:alpha(t.surfaceColor,0.92),backdropFilter:"blur(12px)",borderBottom:bw===0?"none":`${bw}px solid ${t.borderColor}`,padding:`${sp["2xs"]}px ${mob?24:sp.sm}px`,boxShadow:sh}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",maxWidth:mob?"100%":"min(720px, 100%)",marginLeft:"auto",marginRight:"auto",minHeight:40,gap:sp.xs,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:sp["2xs"],flexShrink:0,minWidth:0}}>
            <div style={{width:24,height:24,borderRadius:rad.xs,background:t.accentColor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><MIcon name="auto_awesome" size={12} color="#fff" t={t}/></div>
            <span style={{fontWeight:700,fontSize:ts.sm,fontFamily:headFF,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{vc.brand}</span>
          </div>
          {mob?(
            <Hoverable mt={m.micro} onClick={()=>setMenuOpen(!menuOpen)} style={{width:36,height:36,borderRadius:rad.sm,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}} hoverStyle={{background:alpha(t.accentColor,0.08)}} pressStyle={m.press}>
              <MIcon name={menuOpen?"close":"menu"} size={20} color={t.textColor} t={t}/>
            </Hoverable>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:sp.xs,minWidth:0,overflow:"hidden"}}>
              {vc.navLinks.slice(0,3).map((n,i)=>(<Hoverable key={n} onClick={()=>setSelectedNav(i)} mt={m.micro} style={{fontSize:ts.xs,color:selectedNav===i?t.accentColor:t.mutedColor,cursor:"pointer",borderBottom:selectedNav===i?`2px solid ${t.accentColor}`:"2px solid transparent",paddingBottom:2,whiteSpace:"nowrap"}} hoverStyle={m.linkHover} pressStyle={m.linkPress}>{n}</Hoverable>))}
              <Hoverable mt={m.sm} style={{background:t.accentColor,color:"#fff",padding:`${sp["3xs"]}px ${sp.xs}px`,borderRadius:rad.sm,fontSize:ts.xs,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}} hoverStyle={m.hoverGlow} pressStyle={m.press}>{vc.navLinks[3]||"Sign in"}</Hoverable>
            </div>
          )}
        </div>
        {/* Mobile dropdown menu */}
        {mob&&menuOpen&&(
          <div style={{display:"flex",flexDirection:"column",gap:sp["3xs"],padding:`${sp.xs}px 0`,borderTop:bdr}}>
            {vc.navLinks.slice(0,3).map((n,i)=>(<Hoverable key={n} onClick={()=>{setSelectedNav(i);setMenuOpen(false);}} mt={m.micro} style={{fontSize:ts.sm,color:selectedNav===i?t.accentColor:t.textColor,cursor:"pointer",padding:`${sp["2xs"]}px 0`,fontWeight:selectedNav===i?600:400}} hoverStyle={m.linkHover} pressStyle={m.linkPress}>{n}</Hoverable>))}
            <Hoverable mt={m.sm} onClick={()=>setMenuOpen(false)} style={{background:t.accentColor,color:"#fff",padding:`${sp["2xs"]}px ${sp.xs}px`,borderRadius:rad.sm,fontSize:ts.sm,fontWeight:600,cursor:"pointer",textAlign:"center",marginTop:sp["3xs"]}} hoverStyle={m.hoverGlow} pressStyle={m.press}>{vc.navLinks[3]||"Sign in"}</Hoverable>
          </div>
        )}
      </div>

      <div style={{maxWidth:mob?"100%":"min(720px, 100%)",marginLeft:"auto",marginRight:"auto",padding:contentPad}}>

        {/* ─── HERO ─── */}
        <div style={{textAlign:"center",padding:`${sp["2xl"]}px 0 ${sp.xl}px`}}>
          {/* Optional pill/badge */}
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:alpha(t.accentColor,0.1),color:t.accentColor,padding:`${sp["3xs"]}px ${sp.xs}px`,borderRadius:999,fontSize:ts.xs,fontWeight:600,marginBottom:sp.sm}}>
            <MIcon name="auto_awesome" size={12} color={t.accentColor} t={t}/> New: Automations are here
          </div>
          <h1 style={{marginTop:0,marginBottom:sp.xs,fontSize:ts["2xl"],fontWeight:800,lineHeight:1.1,fontFamily:headFF,letterSpacing:"-0.02em",wordBreak:"break-word"}}>{vc.headline}<br/><span style={{color:t.accentColor,fontSize:ts.xl}}>{vc.headlineAccent}</span></h1>
          <p style={{marginTop:0,marginBottom:sp.md,marginLeft:"auto",marginRight:"auto",fontSize:ts.md,color:t.mutedColor,maxWidth:"min(480px, 100%)",lineHeight:1.6}}>{vc.subtitle}</p>
          <div style={{display:"flex",gap:sp.xs,justifyContent:"center",flexWrap:"wrap"}}>
            <Hoverable mt={m.md} pressStyle={m.press}
              onMouseDown={()=>setHeroPressed(0)}
              onMouseUp={()=>setHeroPressed(null)}
              onMouseLeave={()=>setHeroPressed(null)}
              style={{display:"inline-flex",alignItems:"center",gap:6,background:t.accentColor,color:"#fff",padding:`${sp.xs}px ${sp.lg}px`,borderRadius:rad.sm,fontWeight:600,fontSize:ts.base,cursor:"pointer",boxShadow:shAccent,minHeight:44,...(heroPressed===0?m.press:{})}} hoverStyle={m.btnHover} pressStyle={m.press}>{vc.cta} <MIcon name="arrow_forward" size={14} color="#fff" t={t}/></Hoverable>
            <Hoverable mt={m.md} pressStyle={m.press}
              onMouseDown={()=>setHeroPressed(1)}
              onMouseUp={()=>setHeroPressed(null)}
              onMouseLeave={()=>setHeroPressed(null)}
              style={{display:"inline-flex",alignItems:"center",gap:6,border:bw===0?"none":`${bw}px solid ${t.secondaryColor}`,color:t.secondaryColor,padding:`${sp.xs}px ${sp.lg}px`,borderRadius:rad.sm,fontWeight:600,fontSize:ts.base,cursor:"pointer",background:"transparent",minHeight:44,...(heroPressed===1?m.press:{})}} hoverStyle={{background:alpha(t.secondaryColor,0.06)}}>{vc.ctaSecondary}</Hoverable>
          </div>

          {/* Social Proof */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:sp.sm,marginTop:sp.lg}}>
            <AvatarStack names={vc.socialProofAvatars} max={4} size={28} t={t} rad={rad} ts={ts}/>
            <span style={{fontSize:ts.sm,color:t.mutedColor}}>{vc.socialProofText}</span>
          </div>
        </div>

        {/* ─── LOGO BAR ─── */}
        <div style={{textAlign:"center",padding:`${sp.md}px 0`,borderTop:bw===0?"none":`${bw}px solid ${t.borderColor}`,borderBottom:bw===0?"none":`${bw}px solid ${t.borderColor}`,marginBottom:sp.xl}}>
          <div style={{fontSize:ts.xs,color:t.mutedColor,textTransform:"uppercase",letterSpacing:1,marginBottom:sp.sm,fontWeight:600}}>Trusted by teams at</div>
          <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:sp.lg,flexWrap:"wrap"}}>
            {vc.logos.map(l=>(<Hoverable key={l} mt={m.sm} style={{fontSize:ts.sm,fontWeight:700,color:t.mutedColor,opacity:0.4,letterSpacing:0.5,cursor:"default",padding:`${sp["3xs"]}px ${sp.xs}px`}} hoverStyle={m.logoHover}>{l}</Hoverable>))}
          </div>
        </div>

        {/* ─── FEATURES GRID ─── */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(min(160px, 100%), 1fr))",gap:sp.sm,marginBottom:sp.xl}}>
          {vc.features.map((f,i)=>(
            <Hoverable key={i} mt={m.md} style={{background:t.surfaceColor,border:bdr,borderRadius:rad.md,padding:sp.sm,boxShadow:sh}} hoverStyle={m.hoverLift}>
              <div style={{width:32,height:32,borderRadius:rad.sm,background:i===0?alpha(t.accentColor,0.12):i===1?alpha(t.secondaryColor,0.12):alpha(t.tertiaryColor,0.12),color:i===0?t.accentColor:i===1?t.secondaryColor:t.tertiaryColor,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:sp.xs}}>{icons[i]}</div>
              <div style={{fontWeight:600,marginBottom:sp["3xs"],fontSize:ts.md,fontFamily:headFF}}>{f.t}</div>
              <p style={{marginTop:0,marginBottom:0,fontSize:ts.sm,color:t.mutedColor,lineHeight:1.5}}>{f.d}</p>
            </Hoverable>
          ))}
        </div>

        {/* ─── STATS STRIP ─── */}
        <div style={{display:"flex",justifyContent:"center",gap:`clamp(${sp.sm}px, 4vw, ${sp.xl}px)`,padding:`${sp.lg}px 0`,marginBottom:sp.xl,borderTop:bw===0?"none":`${bw}px solid ${t.borderColor}`,borderBottom:bw===0?"none":`${bw}px solid ${t.borderColor}`,flexWrap:"wrap"}}>
          {vc.stats.map((s,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <div style={{fontSize:ts.xl,fontWeight:800,color:t.accentColor,fontFamily:headFF}}>{s.v}</div>
              <div style={{fontSize:ts.xs,color:t.mutedColor,textTransform:"uppercase",letterSpacing:0.5,fontWeight:500}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* ─── TESTIMONIAL ─── */}
        <div style={{background:t.surfaceColor,border:bdr,borderRadius:rad.lg,padding:sp.xl,textAlign:"center",marginBottom:sp.xl,boxShadow:sh,position:"relative"}}>
          <div style={{position:"absolute",top:sp.sm,left:sp.md,fontSize:48,color:alpha(t.accentColor,0.15),fontFamily:"Georgia, serif",lineHeight:1}}>{"\u201C"}</div>
          <p style={{marginTop:0,marginBottom:sp.sm,marginLeft:"auto",marginRight:"auto",fontSize:ts.md,fontStyle:"italic",lineHeight:1.6,maxWidth:"min(480px, 100%)",color:t.textColor}}>{vc.testimonial}</p>
          <div style={{fontSize:ts.sm,color:t.mutedColor,fontWeight:500}}>{vc.testimonialAuthor}</div>
        </div>

        {/* ─── PRICING ─── */}
        <div style={{marginBottom:sp.xl}}>
          <h2 style={{textAlign:"center",fontSize:ts.xl,fontWeight:700,marginBottom:sp["3xs"],fontFamily:headFF}}>Pricing</h2>
          <p style={{textAlign:"center",fontSize:ts.sm,color:t.mutedColor,marginBottom:sp.lg}}>Start free, scale when ready.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(min(160px, 100%), 1fr))",gap:sp.sm}}>
            {vc.pricing.map((tier,i)=>{
              const isSel = selectedTier === i;
              return (
                <div key={i} onClick={()=>setSelectedTier(isSel?null:i)} style={{background:t.surfaceColor,border:isSel?bdrAccent:(tier.pop?bdrAccent:bdr),borderRadius:rad.md,padding:sp.md,boxShadow:isSel?shAccent:tier.pop?shAccent:sh,position:"relative",display:"flex",flexDirection:"column",cursor:"pointer",transition:m.md,...(isSel?m.expand:{})}}>
                  {tier.pop&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:t.accentColor,color:"#fff",padding:`2px ${sp.xs}px`,borderRadius:rad.full,fontSize:ts.xs,fontWeight:700}}>Popular</div>}
                  <div style={{fontSize:ts.sm,fontWeight:600,color:isSel?t.accentColor:tier.pop?t.accentColor:t.textColor,marginBottom:sp["3xs"]}}>{tier.n}</div>
                  <div style={{fontSize:ts.xl,fontWeight:800,fontFamily:headFF,marginBottom:sp["3xs"]}}>{tier.p}<span style={{fontSize:ts.xs,fontWeight:400,color:t.mutedColor}}>{tier.p!=="Custom"?"/mo":""}</span></div>
                  <div style={{fontSize:ts.xs,color:t.mutedColor,marginBottom:sp.sm}}>{tier.d}</div>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:sp["3xs"],marginBottom:sp.sm}}>
                    {tier.fs.map((f,fi)=>(<div key={fi} style={{display:"flex",alignItems:"center",gap:6,fontSize:ts.sm,color:t.textColor}}><Check size={13} color={t.successColor}/>{f}</div>))}
                  </div>
                  <Hoverable mt={m.sm} pressStyle={m.press} style={{textAlign:"center",padding:`${sp["2xs"]}px 0`,borderRadius:rad.sm,fontWeight:600,fontSize:ts.sm,cursor:"pointer",background:isSel||tier.pop?t.accentColor:"transparent",color:isSel||tier.pop?"#fff":t.accentColor,border:bw===0?"none":`${bw}px solid ${t.accentColor}`}} hoverStyle={m.btnHover}>
                    {tier.p==="Custom"?"Contact Sales":"Get Started"}
                  </Hoverable>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── NEWSLETTER ─── */}
        <div style={{background:alpha(t.accentColor,0.06),border:bdr,borderRadius:rad.lg,padding:`${sp.lg}px ${sp.md}px`,textAlign:"center",marginBottom:sp.xl}}>
          <MIcon name="mail" size={28} color={t.accentColor} t={t} style={{marginBottom:sp.xs}}/>
          <h3 style={{fontSize:ts.md,fontWeight:700,fontFamily:headFF,marginBottom:sp["2xs"]}}>{vc.newsletterHeadline}</h3>
          <div style={{display:"flex",flexDirection:mob?"column":"row",gap:sp.xs,maxWidth:360,margin:"0 auto",marginTop:sp.sm}}>
            <input type="email" placeholder={vc.newsletterPlaceholder} style={{flex:1,padding:`${sp["2xs"]}px ${sp.sm}px`,borderRadius:rad.sm,border:bdr,background:t.backgroundColor,color:t.textColor,fontSize:ts.sm,fontFamily:bodyFF,outline:"none",minWidth:0}}/>
            <Btn label={vc.newsletterCta} isPrimary t={t} m={m} sp={sp} ts={ts} bodyFF={bodyFF} sh={shAccent}/>
          </div>
        </div>

        {/* ─── FAQ ─── */}
        <div style={{marginBottom:sp.xl}}>
          <h2 style={{textAlign:"center",fontSize:ts.xl,fontWeight:700,marginBottom:sp.lg,fontFamily:headFF}}>FAQ</h2>
          <div style={{display:"flex",flexDirection:"column",gap:sp["2xs"]}}>
            {vc.faq.map((item,i)=>(
              <div key={i} style={{background:t.surfaceColor,border:bdr,borderRadius:rad.md,overflow:"hidden",boxShadow:sh}}>
                <Hoverable mt={m.sm} pressStyle={m.press}
                  onClick={()=>setOpenFaq(openFaq===i?null:i)}
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:`${sp.sm}px ${sp.md}px`,cursor:"pointer",fontWeight:600,fontSize:ts.sm}}
                  hoverStyle={{background:alpha(t.accentColor,0.04)}}>
                  <span>{item.q}</span>
                  <ChevronDown size={16} style={{color:t.mutedColor,transform:openFaq===i?"rotate(180deg)":"rotate(0deg)",transition:m.sm}}/>
                </Hoverable>
                {openFaq===i&&(
                  <div style={{padding:`4px ${sp.md}px ${sp.sm}px`,fontSize:ts.sm,color:t.mutedColor,lineHeight:1.6,borderTop:bdr}}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ─── FOOTER ─── */}
        <div style={{borderTop:bw===0?"none":`${bw}px solid ${t.borderColor}`,padding:`${sp.lg}px 0 ${sp.md}px`}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(min(120px, 100%), 1fr))",gap:sp.md,marginBottom:sp.lg}}>
            {Object.entries(vc.footerLinks).map(([group,links])=>(
              <div key={group}>
                <div style={{fontSize:ts.xs,fontWeight:700,color:t.textColor,textTransform:"uppercase",letterSpacing:0.8,marginBottom:sp.xs}}>{group}</div>
                {links.map(l=>(<Hoverable key={l} mt={m.micro} style={{fontSize:ts.sm,color:t.mutedColor,padding:`${sp["3xs"]}px 0`,cursor:"pointer"}} hoverStyle={m.linkHover} pressStyle={m.linkPress}>{l}</Hoverable>))}
              </div>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:sp.sm,borderTop:bw===0?"none":`${bw}px solid ${t.borderColor}`}}>
            <div style={{display:"flex",alignItems:"center",gap:sp.xs}}>
              <div style={{width:20,height:20,borderRadius:rad.xs,background:t.accentColor,display:"flex",alignItems:"center",justifyContent:"center"}}><MIcon name="auto_awesome" size={10} color="#fff" t={t}/></div>
              <span style={{fontSize:ts.xs,color:t.mutedColor}}>{vc.footerCopy}</span>
            </div>
            <div style={{display:"flex",gap:sp.sm}}>
              {["language","mail"].map((icon,i)=>(<MIcon key={i} name={icon} size={14} color={t.mutedColor} t={t} style={{cursor:"pointer"}}/>))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* Template: DashPreview — Full M3 dashboard with sidebar, breadcrumbs, stats, progress, tabs, chart, table, activity feed */
function DashPreview({ t, w = 1024 }) {
  const tk = useThemeTokens(t);
  const { sp, ts, bodyFF, headFF, bdr, bdrAccent, bw, sh, shAccent, rad } = tk;
  const m = useMotion(t);
  const voice = vibeFromMatrix(t.vibeX, t.vibeY);
  const vc = getVibeContent(voice, t.vibeX, t.vibeY).dash;
  const [selectedStat, setSelectedStat] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [selectedRow, setSelectedRow] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const mob = w < 700;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobSidebarOpen, setMobSidebarOpen] = useState(false);
  const sidebarIcons = ["home","directions_run","flag","settings"];
  const chartData = [65,42,78,55,90,72,48];
  const chartDays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const chartMax = Math.max(...chartData);

  return (
    <div style={{fontSize:ts.base,color:t.textColor,fontFamily:bodyFF,background:t.backgroundColor,minHeight:"100vh",display:"flex"}}>

      {/* ─── SIDEBAR (desktop: inline, mobile: overlay) ─── */}
      {mob&&mobSidebarOpen&&(
        <div onClick={()=>setMobSidebarOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:19}}/>
      )}
      {(mob?mobSidebarOpen:true)&&(
        <div style={{
          ...(mob?{position:"fixed",left:0,top:0,height:"100%",zIndex:20,boxShadow:"4px 0 24px rgba(0,0,0,0.2)"}:{}),
          width:mob?220:(sidebarCollapsed?56:180),minWidth:mob?220:(sidebarCollapsed?56:180),
          background:t.surfaceColor,borderRight:bdr,display:"flex",flexDirection:"column",
          padding:`${sp.sm}px ${sp.xs}px`,gap:sp["2xs"],transition:m.md,overflow:"hidden",flexShrink:0
        }}>
          <div style={{display:"flex",alignItems:"center",gap:sp.xs,padding:`${sp.xs}px ${sp["2xs"]}px`,marginBottom:sp.xs,cursor:"pointer"}} onClick={()=>mob?setMobSidebarOpen(false):setSidebarCollapsed(!sidebarCollapsed)}>
            <div style={{width:28,height:28,borderRadius:rad.sm,background:t.accentColor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><MIcon name={mob?"close":"dashboard"} size={14} color="#fff" t={t}/></div>
            {(mob||!sidebarCollapsed)&&<span style={{fontWeight:700,fontSize:ts.sm,fontFamily:headFF,whiteSpace:"nowrap"}}>Dashboard</span>}
          </div>
          {vc.sidebarLinks.map((link,i)=>(
            <Hoverable key={i} mt={m.sm} style={{display:"flex",alignItems:"center",gap:sp.xs,padding:`${sp["2xs"]}px ${sp["2xs"]}px`,borderRadius:rad.sm,cursor:"pointer",background:i===0?alpha(t.accentColor,0.1):"transparent",color:i===0?t.accentColor:t.mutedColor,fontSize:ts.sm,whiteSpace:"nowrap"}} hoverStyle={{background:alpha(t.accentColor,0.06)}}>
              <MIcon name={sidebarIcons[i]} size={18} color={i===0?t.accentColor:t.mutedColor} t={t} style={{flexShrink:0}}/>
              {(mob||!sidebarCollapsed)&&<span>{link}</span>}
            </Hoverable>
          ))}
          <div style={{flex:1}}/>
          <div style={{display:"flex",alignItems:"center",gap:sp.xs,padding:`${sp.xs}px ${sp["2xs"]}px`,borderTop:bdr,paddingTop:sp.sm}}>
            <Avatar name={vc.sidebarUser} size={28} t={t} rad={rad}/>
            {(mob||!sidebarCollapsed)&&<div style={{overflow:"hidden"}}>
              <div style={{fontSize:ts.xs,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{vc.sidebarUser}</div>
              <div style={{fontSize:ts.xs,color:t.mutedColor,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{vc.sidebarRole}</div>
            </div>}
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <div style={{flex:1,minWidth:0,overflow:"auto"}}>
        {/* Mobile top bar with menu button */}
        {mob&&(
          <div style={{display:"flex",alignItems:"center",gap:sp.xs,padding:`${sp["2xs"]}px 24px`,background:t.surfaceColor,borderBottom:bdr,position:"sticky",top:0,zIndex:10}}>
            <Hoverable mt={m.micro} onClick={()=>setMobSidebarOpen(true)} style={{width:36,height:36,borderRadius:rad.sm,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} hoverStyle={{background:alpha(t.accentColor,0.08)}} pressStyle={m.press}>
              <MIcon name="menu" size={20} color={t.textColor} t={t}/>
            </Hoverable>
            <span style={{fontWeight:700,fontSize:ts.sm,fontFamily:headFF}}>Dashboard</span>
          </div>
        )}
        <div style={{maxWidth:mob?"100%":"min(720px, 100%)",margin:mob?"0":"0 auto",padding:mob?"24px":`clamp(8px, 3vw, ${sp.lg}px)`}}>

        {/* Breadcrumbs */}
        <div style={{marginBottom:sp.sm}}>
          <Breadcrumbs items={vc.breadcrumbs} t={t} ts={ts} sp={sp}/>
        </div>

        {/* Page Header */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:sp.lg,flexWrap:"wrap",gap:sp.sm}}>
          <div>
            <h1 style={{fontSize:ts.xl,fontWeight:700,marginBottom:sp["3xs"],fontFamily:headFF,wordBreak:"break-word"}}>{vc.greeting}</h1>
            <p style={{color:t.mutedColor,fontSize:ts.sm,margin:0}}>{vc.subtitle}</p>
          </div>
          <div style={{display:"flex",gap:sp["2xs"],flexWrap:"wrap"}}>
            {["Day","Week","Month"].map((p,i)=>(<button key={i} onClick={()=>setSelectedPeriod(i)} style={{padding:`${sp["3xs"]}px ${sp.sm}px`,borderRadius:rad.sm,border:selectedPeriod===i?"none":bdr,background:selectedPeriod===i?t.accentColor:t.surfaceColor,color:selectedPeriod===i?"#fff":t.textColor,fontSize:ts.xs,fontWeight:600,cursor:"pointer",transition:m.sm,boxShadow:selectedPeriod===i?shAccent:"none"}}>{p}</button>))}
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(min(130px, 100%), 1fr))",gap:sp.sm,marginBottom:sp.lg}}>
          {vc.statsLabels.map((l,i)=>{
            const isSel = selectedStat === i;
            const colors = [t.accentColor,t.secondaryColor,t.tertiaryColor];
            return (
              <Hoverable key={i} onClick={()=>setSelectedStat(isSel?null:i)} mt={m.md} style={{background:t.surfaceColor,border:isSel?bdrAccent:bdr,borderRadius:rad.md,padding:sp.md,boxShadow:sh,cursor:"pointer"}} hoverStyle={m.hoverLift}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:sp.xs}}>
                  <div style={{fontSize:ts.xs,color:t.mutedColor,fontWeight:500}}>{l}</div>
                  <MIcon name={["directions_walk","local_fire_department","bedtime"][i]} size={16} color={colors[i]} t={t}/>
                </div>
                <div style={{fontSize:ts.xl,fontWeight:700,color:colors[i],fontFamily:headFF}}>
                  {i===0?"8,432":i===1?"1,847":"7.2h"}
                </div>
                <div style={{fontSize:ts.xs,color:t.successColor,marginTop:sp["3xs"],fontWeight:500}}>
                  {i===0?"+12%":i===1?"+8%":"+0.5h"} <span style={{color:t.mutedColor}}>vs last week</span>
                </div>
              </Hoverable>
            );
          })}
        </div>

        {/* Progress Bars */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(min(140px, 100%), 1fr))",gap:sp.sm,marginBottom:sp.lg}}>
          {vc.progressMetrics.map((pm,i)=>{
            const color = pm.c==="accent"?t.accentColor:pm.c==="secondary"?t.secondaryColor:t.tertiaryColor;
            return (
              <div key={i} style={{background:t.surfaceColor,border:bdr,borderRadius:rad.md,padding:sp.sm,boxShadow:sh}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:sp.xs}}>
                  <span style={{fontSize:ts.xs,color:t.mutedColor}}>{pm.l}</span>
                  <span style={{fontSize:ts.xs,fontWeight:700,color}}>{pm.v}%</span>
                </div>
                <ProgressBar value={pm.v} color={color} t={t} rad={rad} height={6}/>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <TabBar tabs={vc.tabLabels} active={activeTab} onChange={setActiveTab} t={t} ts={ts} sp={sp} m={m}/>

        {/* Chart Placeholder */}
        <div style={{background:t.surfaceColor,border:bdr,borderRadius:`0 0 ${rad.md}px ${rad.md}px`,padding:sp.md,boxShadow:sh,marginBottom:sp.lg}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:sp.md}}>
            <h3 style={{fontWeight:700,fontSize:ts.md,fontFamily:headFF,margin:0}}>{vc.chartTitle}</h3>
            <span style={{fontSize:ts.xs,color:t.mutedColor}}>Last 7 days</span>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:sp["2xs"],height:100}}>
            {chartData.map((v,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:sp["3xs"]}}>
                <div style={{width:"100%",height:`${(v/chartMax)*80}px`,borderRadius:`${rad.xs}px ${rad.xs}px 0 0`,background:i===4?t.accentColor:alpha(t.accentColor,0.25),transition:m.md}}/>
                <span style={{fontSize:ts.xs,color:t.mutedColor}}>{chartDays[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div style={{background:t.surfaceColor,border:bdr,borderRadius:rad.md,padding:sp.md,boxShadow:sh,marginBottom:sp.lg}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:sp.md}}>
            <h3 style={{fontWeight:700,fontSize:ts.md,fontFamily:headFF,margin:0}}>{vc.tableTitle}</h3>
            <Btn label="View All" isGhost t={t} m={m} sp={sp} ts={ts} bodyFF={bodyFF} bw={bw}/>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{borderBottom:bw===0?"none":`${Math.max(bw,1)*2}px solid ${t.borderColor}`}}>
                <th style={{padding:`${sp.xs}px ${sp.sm}px`,textAlign:"left",fontWeight:600,fontSize:ts.xs,color:t.mutedColor,textTransform:"uppercase",letterSpacing:0.5}}>Activity</th>
                <th style={{padding:`${sp.xs}px ${sp.sm}px`,textAlign:"left",fontWeight:600,fontSize:ts.xs,color:t.mutedColor,textTransform:"uppercase",letterSpacing:0.5}}>Status</th>
                <th style={{padding:`${sp.xs}px ${sp.sm}px`,textAlign:"right",fontWeight:600,fontSize:ts.xs,color:t.mutedColor,textTransform:"uppercase",letterSpacing:0.5}}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {vc.tableRows.map((r,i)=>{
                const isSel = selectedRow === i;
                return (
                  <tr key={i} onClick={()=>setSelectedRow(isSel?null:i)} style={{borderBottom:bw===0?"none":`${bw}px solid ${t.borderColor}`,background:isSel?alpha(t.accentColor,0.08):undefined,cursor:"pointer",transition:m.sm}}>
                    <td style={{padding:`${sp.xs}px ${sp.sm}px`,fontSize:ts.sm}}>{r.n}</td>
                    <td style={{padding:`${sp.xs}px ${sp.sm}px`,fontSize:ts.sm}}>
                      <span style={{padding:`${sp["3xs"]}px ${sp.xs}px`,borderRadius:rad.full,background:r.s==="Completed"||r.s==="Done"?alpha(t.successColor,0.15):r.s==="Active"||r.s==="In Progress"?alpha(t.accentColor,0.15):alpha(t.mutedColor,0.15),color:r.s==="Completed"||r.s==="Done"?t.successColor:r.s==="Active"||r.s==="In Progress"?t.accentColor:t.mutedColor,fontSize:ts.xs,fontWeight:600}}>{r.s}</span>
                    </td>
                    <td style={{padding:`${sp.xs}px ${sp.sm}px`,textAlign:"right",fontSize:ts.sm,fontWeight:600,color:t.mutedColor}}>{r.a}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Activity Feed */}
        <div style={{background:t.surfaceColor,border:bdr,borderRadius:rad.md,padding:sp.md,boxShadow:sh,marginBottom:sp.lg}}>
          <h3 style={{fontWeight:700,fontSize:ts.md,fontFamily:headFF,margin:0,marginBottom:sp.md}}>Recent Activity</h3>
          <div style={{display:"flex",flexDirection:"column",gap:sp.sm}}>
            {vc.activityFeed.map((item,i)=>(
              <div key={i} style={{display:"flex",gap:sp.sm,alignItems:"flex-start"}}>
                <div style={{width:8,height:8,borderRadius:rad.full,background:i===0?t.accentColor:i===1?t.secondaryColor:t.tertiaryColor,marginTop:6,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:sp.xs}}>
                    <span style={{fontSize:ts.sm,fontWeight:600}}>{item.t}</span>
                    <span style={{fontSize:ts.xs,color:t.mutedColor,flexShrink:0}}>{item.ago}</span>
                  </div>
                  <div style={{fontSize:ts.xs,color:t.mutedColor}}>{item.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton Loading Preview */}
        <div style={{background:t.surfaceColor,border:bdr,borderRadius:rad.md,padding:sp.md,boxShadow:sh}}>
          <div style={{display:"flex",alignItems:"center",gap:sp.sm,marginBottom:sp.md}}>
            <Skeleton width={32} height={32} rounded t={t} rad={rad}/>
            <div style={{flex:1}}>
              <Skeleton width="60%" height={12} t={t} rad={rad}/>
              <div style={{height:sp["2xs"]}}/>
              <Skeleton width="40%" height={10} t={t} rad={rad}/>
            </div>
          </div>
          <Skeleton width="100%" height={8} t={t} rad={rad}/>
          <div style={{height:sp.xs}}/>
          <Skeleton width="80%" height={8} t={t} rad={rad}/>
        </div>

        </div>
      </div>
    </div>
  );
}

/* Template: MarketPreview — Full M3 marketplace with breadcrumbs, filters, product grid, detail, reviews, cart */
function MarketPreview({ t, w = 1024 }) {
  const tk = useThemeTokens(t);
  const { sp, ts, bodyFF, headFF, bdr, bdrAccent, bw, sh, shAccent, rad } = tk;
  const m = useMotion(t);
  const voice = vibeFromMatrix(t.vibeX, t.vibeY);
  const vc = getVibeContent(voice, t.vibeX, t.vibeY).market;
  const [selectedCat, setSelectedCat] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [addedItems, setAddedItems] = useState(new Set());
  const [favorites, setFavorites] = useState(new Set());
  const [searchFocus, setSearchFocus] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortIdx, setSortIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const plantIcons = ["eco","yard","grass","potted_plant","forest","park"];
  const mob = w < 700;

  const addToCart = (i, product) => {
    setAddedItems(new Set([...addedItems, i]));
    setCartItems(prev => [...prev, product]);
    setCartCount(prev => prev + 1);
    setTimeout(() => setAddedItems(new Set([...addedItems].filter(x => x !== i))), 1500);
  };

  return (
    <div style={{fontSize:ts.base,color:t.textColor,fontFamily:bodyFF,background:t.backgroundColor,minHeight:"100vh"}}>

      {/* ─── NAV ─── */}
      <div style={{background:t.surfaceColor,borderBottom:bdr,padding:`${sp["2xs"]}px ${mob?24:sp.sm}px`,boxShadow:sh}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",maxWidth:mob?"100%":"min(720px, 100%)",margin:"0 auto",minHeight:40,gap:sp.xs}}>
          <div style={{display:"flex",alignItems:"center",gap:sp["2xs"]}}>
            <MIcon name="local_florist" size={20} color={t.accentColor} t={t}/>
            <span style={{fontWeight:700,fontSize:ts.sm,fontFamily:headFF}}>{vc.headline.replace(/[^a-zA-Z\s]/g,"").trim().split(" ").slice(0,2).join(" ")}</span>
          </div>
          {mob?(
            <div style={{display:"flex",alignItems:"center",gap:sp.xs}}>
              <div style={{position:"relative",cursor:"pointer"}}>
                <div style={{width:32,height:32,borderRadius:rad.full,background:alpha(t.accentColor,0.1),display:"flex",alignItems:"center",justifyContent:"center"}}><MIcon name="shopping_cart" size={16} color={t.accentColor} t={t}/></div>
                {cartCount>0&&<div style={{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:9,background:t.dangerColor,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{cartCount}</div>}
              </div>
              <Hoverable mt={m.micro} onClick={()=>setMenuOpen(!menuOpen)} style={{width:36,height:36,borderRadius:rad.sm,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}} hoverStyle={{background:alpha(t.accentColor,0.08)}} pressStyle={m.press}>
                <MIcon name={menuOpen?"close":"menu"} size={20} color={t.textColor} t={t}/>
              </Hoverable>
            </div>
          ):(
            <div style={{display:"flex",alignItems:"center",gap:sp.xs}}>
              <div style={{position:"relative"}}>
                <input type="text" placeholder={vc.searchPlaceholder} onFocus={()=>setSearchFocus(true)} onBlur={()=>setSearchFocus(false)} style={{padding:`${sp["3xs"]}px ${sp.xs}px ${sp["3xs"]}px ${sp.md}px`,borderRadius:rad.full,border:searchFocus?bdrAccent:bdr,background:t.backgroundColor,color:t.textColor,fontSize:ts.xs,width:`clamp(80px, 25vw, 160px)`,transition:m.sm,boxShadow:searchFocus?`0 0 0 3px ${alpha(t.accentColor,0.15)}`:"none"}}/>
                <MIcon name="search" size={12} color={t.mutedColor} t={t} style={{position:"absolute",left:sp.xs,top:"50%",transform:"translateY(-50%)"}}/>
              </div>
              <div style={{position:"relative",cursor:"pointer"}}>
                <div style={{width:32,height:32,borderRadius:rad.full,background:alpha(t.accentColor,0.1),display:"flex",alignItems:"center",justifyContent:"center"}}><MIcon name="shopping_cart" size={16} color={t.accentColor} t={t}/></div>
                {cartCount>0&&<div style={{position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:9,background:t.dangerColor,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700}}>{cartCount}</div>}
              </div>
            </div>
          )}
        </div>
        {mob&&menuOpen&&(
          <div style={{display:"flex",flexDirection:"column",gap:sp["3xs"],padding:`${sp.xs}px 0`,borderTop:bdr}}>
            <div style={{position:"relative"}}>
              <input type="text" placeholder={vc.searchPlaceholder} onFocus={()=>setSearchFocus(true)} onBlur={()=>setSearchFocus(false)} style={{width:"100%",padding:`${sp["2xs"]}px ${sp.xs}px ${sp["2xs"]}px ${sp.md}px`,borderRadius:rad.sm,border:bdr,background:t.backgroundColor,color:t.textColor,fontSize:ts.sm,fontFamily:bodyFF}}/>
              <MIcon name="search" size={14} color={t.mutedColor} t={t} style={{position:"absolute",left:sp.xs,top:"50%",transform:"translateY(-50%)"}}/>
            </div>
          </div>
        )}
      </div>

      <div style={{maxWidth:mob?"100%":"min(720px, 100%)",margin:"0 auto",padding:mob?`${sp.md}px 24px`:`${sp.md}px clamp(8px, 3vw, ${sp.md}px)`}}>

        {/* Breadcrumbs */}
        <div style={{marginBottom:sp.md}}>
          <Breadcrumbs items={vc.breadcrumbs} t={t} ts={ts} sp={sp}/>
        </div>

        {/* Page Header */}
        <div style={{marginBottom:sp.md}}>
          <h1 style={{fontSize:ts.xl,fontWeight:700,marginBottom:sp["2xs"],fontFamily:headFF}}>{vc.headline}</h1>
          <p style={{color:t.mutedColor,fontSize:ts.sm,margin:0}}>Discover our curated collection</p>
        </div>

        {/* Filters + Sort */}
        <div style={{display:"flex",gap:sp.xs,marginBottom:sp.md,alignItems:"center",flexWrap:"wrap"}}>
          {vc.categories.map((c,i)=>(<button key={c} onClick={()=>setSelectedCat(i)} style={{padding:`${sp["3xs"]}px ${sp.xs}px`,borderRadius:rad.full,border:selectedCat===i?"none":bdr,background:selectedCat===i?t.accentColor:t.surfaceColor,color:selectedCat===i?"#fff":t.textColor,fontSize:ts.xs,cursor:"pointer",transition:m.sm,fontWeight:selectedCat===i?600:400}}>{c}</button>))}
          <div style={{marginLeft:"auto"}}>
            <select value={sortIdx} onChange={e=>setSortIdx(+e.target.value)} style={{padding:`${sp["3xs"]}px ${sp.xs}px`,borderRadius:rad.sm,border:bdr,background:t.surfaceColor,color:t.textColor,fontSize:ts.xs,cursor:"pointer"}}>
              {vc.sortOptions.map((o,i)=>(<option key={i} value={i}>{o}</option>))}
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill, minmax(min(150px, 100%), 1fr))`,gap:sp.sm,marginBottom:sp.lg}}>
          {(vc.products||[]).map((product,i)=>{
            const isFav = favorites.has(i);
            const isAdded = addedItems.has(i);
            const colors = [t.accentColor,t.secondaryColor,t.tertiaryColor];
            return (
              <Hoverable key={i} mt={m.md} hoverStyle={m.hoverLift} style={{background:t.surfaceColor,border:bdr,borderRadius:rad.md,overflow:"hidden",boxShadow:sh}}>
                <div onClick={()=>setSelectedProduct(selectedProduct===i?null:i)} style={{width:"100%",height:110,background:lighten(colors[i%3],0.85),display:"flex",alignItems:"center",justifyContent:"center",position:"relative",cursor:"pointer"}}>
                  <MIcon name={plantIcons[i%6]} size={28} color={colors[i%3]} t={t}/>
                  <button onClick={e=>{e.stopPropagation();setFavorites(isFav?new Set([...favorites].filter(x=>x!==i)):new Set([...favorites,i]));}} style={{position:"absolute",top:sp.xs,right:sp.xs,width:28,height:28,borderRadius:rad.full,background:alpha(t.backgroundColor,0.8),border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <MIcon name={isFav?"favorite":"favorite_border"} size={14} color={isFav?t.dangerColor:t.mutedColor} t={t}/>
                  </button>
                </div>
                <div style={{padding:sp.sm}}>
                  <div style={{fontWeight:600,fontSize:ts.sm,marginBottom:sp["3xs"]}}>{product.n}</div>
                  <div style={{fontSize:ts.xs,color:t.mutedColor,marginBottom:sp.xs}}>{product.d}</div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:sp.xs}}>
                    <span style={{fontWeight:700,fontSize:ts.md,color:t.textColor}}>{product.p}</span>
                    <StarRating rating={4+Math.random()} size={10} t={t}/>
                  </div>
                  <button onClick={()=>addToCart(i, product)} style={{width:"100%",padding:`${sp["2xs"]}px`,borderRadius:rad.sm,border:"none",background:isAdded?t.successColor:t.accentColor,color:"#fff",fontSize:ts.xs,fontWeight:600,cursor:"pointer",transition:m.sm}}>
                    {isAdded?"\u2713 Added":vc.addToCart}
                  </button>
                </div>
              </Hoverable>
            );
          })}
        </div>

        {/* Pagination */}
        <div style={{display:"flex",justifyContent:"center",gap:sp["2xs"],marginBottom:sp.lg}}>
          {[1,2,3].map(p=>(
            <button key={p} onClick={()=>setCurrentPage(p)} style={{width:32,height:32,borderRadius:rad.sm,border:currentPage===p?"none":bdr,background:currentPage===p?t.accentColor:"transparent",color:currentPage===p?"#fff":t.mutedColor,fontSize:ts.xs,fontWeight:600,cursor:"pointer",transition:m.sm}}>{p}</button>
          ))}
        </div>

        <SectionDivider t={t} ts={ts} sp={sp}/>

        {/* Product Detail Expanded */}
        <div style={{display:"flex",gap:sp.md,marginBottom:sp.lg,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 200px",minHeight:160,background:lighten(t.accentColor,0.85),borderRadius:rad.md,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <MIcon name="eco" size={48} color={t.accentColor} t={t}/>
          </div>
          <div style={{flex:"1 1 200px"}}>
            <div style={{fontSize:ts.xs,color:t.mutedColor,textTransform:"uppercase",letterSpacing:1,marginBottom:sp["2xs"]}}>Featured</div>
            <h2 style={{fontSize:ts.lg,fontWeight:700,fontFamily:headFF,marginBottom:sp["2xs"]}}>{(vc.products||[])[0]?.n||"Monstera"}</h2>
            <div style={{display:"flex",alignItems:"center",gap:sp.xs,marginBottom:sp.sm}}>
              <StarRating rating={4.7} size={14} t={t}/>
              <span style={{fontSize:ts.xs,color:t.mutedColor}}>{vc.reviewSummary?.count||128} {vc.reviewSummary?.label||"reviews"}</span>
            </div>
            <p style={{fontSize:ts.sm,color:t.mutedColor,lineHeight:1.6,marginBottom:sp.sm}}>{(vc.products||[])[0]?.d||"A stunning tropical specimen"}</p>
            <div style={{fontSize:ts.xl,fontWeight:800,fontFamily:headFF,marginBottom:sp.sm}}>{(vc.products||[])[0]?.p||"$49"}</div>
            <div style={{display:"flex",gap:sp.xs}}>
              <Btn label={vc.addToCart} isPrimary t={t} m={m} sp={sp} ts={ts} bodyFF={bodyFF} sh={shAccent}/>
              <Btn label="Details" isGhost t={t} m={m} sp={sp} ts={ts} bodyFF={bodyFF} bw={bw}/>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div style={{marginBottom:sp.lg}}>
          <div style={{display:"flex",alignItems:"center",gap:sp.sm,marginBottom:sp.md}}>
            <h3 style={{fontWeight:700,fontSize:ts.md,fontFamily:headFF,margin:0}}>Reviews</h3>
            <div style={{display:"flex",alignItems:"center",gap:sp["2xs"]}}>
              <StarRating rating={vc.reviewSummary?.avg||4.7} size={14} t={t}/>
              <span style={{fontSize:ts.sm,fontWeight:700}}>{vc.reviewSummary?.avg||4.7}</span>
              <span style={{fontSize:ts.xs,color:t.mutedColor}}>({vc.reviewSummary?.count||128})</span>
            </div>
          </div>
          {(vc.reviews||[]).map((rev,i)=>(
            <div key={i} style={{background:t.surfaceColor,border:bdr,borderRadius:rad.md,padding:sp.sm,marginBottom:sp.xs,boxShadow:sh}}>
              <div style={{display:"flex",alignItems:"center",gap:sp.xs,marginBottom:sp.xs}}>
                <Avatar name={rev.a} size={28} t={t} rad={rad}/>
                <div>
                  <div style={{fontSize:ts.sm,fontWeight:600}}>{rev.a}</div>
                  <div style={{display:"flex",alignItems:"center",gap:sp["2xs"]}}>
                    <StarRating rating={rev.r} size={10} t={t}/>
                    <span style={{fontSize:ts.xs,color:t.mutedColor}}>{rev.ago}</span>
                  </div>
                </div>
              </div>
              <p style={{fontSize:ts.sm,color:t.mutedColor,margin:0}}>{rev.t}</p>
            </div>
          ))}
        </div>

        <SectionDivider label="Cart" t={t} ts={ts} sp={sp}/>

        {/* Cart Summary */}
        {cartCount > 0 ? (
          <div style={{background:t.surfaceColor,border:bdr,borderRadius:rad.md,padding:sp.md,boxShadow:sh,marginBottom:sp.lg}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:sp.sm}}>
              <span style={{fontWeight:600}}>{cartCount} item{cartCount>1?"s":""}</span>
              <span style={{fontWeight:700,fontSize:ts.md}}>$49.00</span>
            </div>
            <Btn label={vc.checkoutCta} isPrimary t={t} m={m} sp={sp} ts={ts} bodyFF={bodyFF} sh={shAccent}/>
          </div>
        ) : (
          <div style={{textAlign:"center",padding:`${sp.xl}px ${sp.md}px`,marginBottom:sp.lg}}>
            <MIcon name="shopping_cart" size={36} color={t.mutedColor} t={t} style={{marginBottom:sp.sm,opacity:0.4}}/>
            <div style={{fontWeight:600,fontSize:ts.md,marginBottom:sp["2xs"]}}>{vc.emptyTitle}</div>
            <div style={{fontSize:ts.sm,color:t.mutedColor}}>{vc.emptyDesc}</div>
          </div>
        )}

        {/* Skeleton */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(min(150px, 100%), 1fr))",gap:sp.sm}}>
          {[1,2,3].map(i=>(
            <div key={i} style={{background:t.surfaceColor,border:bdr,borderRadius:rad.md,overflow:"hidden",boxShadow:sh}}>
              <Skeleton width="100%" height={90} t={t} rad={{...rad,sm:0}}/>
              <div style={{padding:sp.sm}}>
                <Skeleton width="70%" height={12} t={t} rad={rad}/>
                <div style={{height:sp["2xs"]}}/>
                <Skeleton width="40%" height={10} t={t} rad={rad}/>
                <div style={{height:sp.xs}}/>
                <Skeleton width="100%" height={28} t={t} rad={rad}/>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════
   DEVICE PRESETS AND FRAME
   ═══════════════════════════════════════════════ */
const DEVICE_PRESETS = [
  { name: "iPhone 17", w: 402, h: 874 },
  { name: "iPhone 17 Pro Max", w: 440, h: 956 },
  { name: "iPhone SE", w: 375, h: 667 },
  { name: "iPhone 16", w: 393, h: 852 },
  { name: "Pixel 7", w: 412, h: 915 },
  { name: "Galaxy S24", w: 360, h: 780 },
  { name: "iPad Mini", w: 768, h: 1024 },
  { name: "iPad Air", w: 820, h: 1180 },
  { name: 'iPad Pro 12.9"', w: 1024, h: 1366 },
  { name: "Surface Pro", w: 912, h: 1368 },
  { name: "Nest Hub", w: 1024, h: 600 },
];

function DeviceFrame({ deviceWidth, deviceHeight, children, t, onResize }) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!ref.current) return;
    const measure = () => { const pw = ref.current.parentElement?.clientWidth || 680; setScale(Math.min(1, (pw - 60) / deviceWidth)); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(ref.current.parentElement);
    return () => ro.disconnect();
  }, [deviceWidth]);
  const startDrag = (axis) => (e) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startW = deviceWidth, startH = deviceHeight;
    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      const newW = (axis === "y") ? startW : Math.round(Math.max(320, Math.min(1400, startW + dx * 2)));
      const newH = (axis === "x") ? startH : Math.round(Math.max(400, Math.min(2000, startH + dy)));
      onResize?.(newW, newH);
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  const scaledH = deviceHeight * scale;
  const hBase = { position:"absolute", background:"transparent", zIndex:10 };
  const barBase = { background:"#666", borderRadius:3, transition:"background 0.15s" };
  return (
    <div ref={ref} style={{display:"flex",justifyContent:"center",position:"relative"}}>
      <div style={{position:"relative"}}>
        <div style={{width: deviceWidth * scale, height: scaledH, border:"1px solid #555", borderRadius:12, overflow:"hidden", background:t.backgroundColor, boxShadow:"0 8px 40px rgba(0,0,0,0.4)"}}>
          <div style={{transform:`scale(${scale})`, transformOrigin:"top left", width:deviceWidth, height:deviceHeight, overflowY:"auto", overflowX:"hidden"}}>
            {children}
          </div>
        </div>
        <div onMouseDown={startDrag("x")} style={{...hBase, top:0, right:-16, width:16, height:scaledH, cursor:"ew-resize", display:"flex", alignItems:"center", justifyContent:"center"}}
          onMouseEnter={e=>{const b=e.currentTarget.firstChild;if(b)b.style.background='#999';}} onMouseLeave={e=>{const b=e.currentTarget.firstChild;if(b)b.style.background='#666';}}>
          <div style={{...barBase, width:4, height:40}}/>
        </div>
        <div onMouseDown={startDrag("y")} style={{...hBase, bottom:-16, left:0, width:deviceWidth*scale, height:16, cursor:"ns-resize", display:"flex", alignItems:"center", justifyContent:"center"}}
          onMouseEnter={e=>{const b=e.currentTarget.firstChild;if(b)b.style.background='#999';}} onMouseLeave={e=>{const b=e.currentTarget.firstChild;if(b)b.style.background='#666';}}>
          <div style={{...barBase, width:40, height:4}}/>
        </div>
        <div onMouseDown={startDrag("both")} style={{...hBase, bottom:-16, right:-16, width:16, height:16, cursor:"nwse-resize", display:"flex", alignItems:"center", justifyContent:"center"}}
          onMouseEnter={e=>{const b=e.currentTarget.firstChild;if(b)b.style.background='#999';}} onMouseLeave={e=>{const b=e.currentTarget.firstChild;if(b)b.style.background='#666';}}>
          <div style={{...barBase, width:8, height:8, borderRadius:4}}/>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════ */
let _nid = 100;

export default function LLMThemeBuilder() {
  const [saved, setSaved] = useState([{id:1,name:"My First Theme",theme:{...DEFAULT_THEME}}]);
  const [activeId, setActiveId] = useState(1);
  const [theme, setTheme] = useState({...DEFAULT_THEME});
  const [preview, setPreview] = useState("landing");
  const [device, setDevice] = useState("iPhone 17");
  const [customWidth, setCustomWidth] = useState(402);
  const [customHeight, setCustomHeight] = useState(874);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportTab, setExportTab] = useState("css");
  const [showNew, setShowNew] = useState(false);
  const [editName, setEditName] = useState(false);
  const [tmpName, setTmpName] = useState("");
  const [sidebar, setSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const touchRef = useRef(null);
  const [vibe, setVibe] = useState("");
  const [vibeFb, setVibeFb] = useState("");
  const [genning, setGenning] = useState(false);
  const [apiKey] = useState(() => localStorage.getItem('llm-theme-api-key') || import.meta.env.VITE_ANTHROPIC_API_KEY || "");
  const [warmthW, setWarmthW] = useState(0);
  const [intensityW, setIntensityW] = useState(0);
  const [depthW, setDepthW] = useState(0);
  const colorSnap = useRef(null);
  const lastMotionRef = useRef("smooth");

  const up = useCallback((k,v) => setTheme(p=>({...p,[k]:v})), []);
  useEffect(()=>{loadFont(theme.bodyFont);loadFont(theme.headingFont);loadFont(theme.monoFont);},[theme.bodyFont,theme.headingFont,theme.monoFont]);

  // Mobile detection + auto-close sidebar on mobile
  useEffect(()=>{
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = e => { setIsMobile(e.matches); if(e.matches) setSidebar(false); };
    handler(mq); mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  },[]);

  const c = useMemo(()=>makeChrome(theme.accentColor,theme.secondaryColor),[theme.accentColor,theme.secondaryColor]);
  const t = theme;
  const bodyFF = useMemo(()=>FONTS.find(f=>f.name===t.bodyFont)?.value||"system-ui",[t.bodyFont]);
  const headFF = useMemo(()=>FONTS.find(f=>f.name===t.headingFont)?.value||bodyFF,[t.headingFont,bodyFF]);
  const monoFF = useMemo(()=>FONTS.find(f=>f.name===t.monoFont)?.value||"monospace",[t.monoFont]);

  const startSnap = useCallback(()=>{ if(!colorSnap.current){colorSnap.current={};COLOR_KEYS.forEach(k=>{colorSnap.current[k]=theme[k]});} },[theme]);
  const applyWarmth = useCallback(v=>{ startSnap();setWarmthW(v); const s=colorSnap.current,u={}; COLOR_KEYS.forEach(k=>{const{L,C,H}=hexToOklch(s[k]);const target=v>0?60:250;const diff=(target-H+180)%360-180;const shift=Math.sign(diff)*Math.abs(v)*1.5;u[k]=oklchToHex(L,C,((H+shift)%360+360)%360);}); setTheme(p=>({...p,...u})); },[startSnap]);

  const applyDepth = useCallback(v=>{ startSnap();setDepthW(v); const s=colorSnap.current,d=v/100,u={};
    const textKeys = ["textColor","mutedColor"];
    const bgKeys = ["surfaceColor","backgroundColor","borderColor"];
    // First pass: compute new bg values
    bgKeys.forEach(k=>{const{L,C,H}=hexToOklch(s[k]); u[k]=oklchToHex(Math.max(0,Math.min(1,L+d*0.4)),C,H);});
    // Second pass: compute new text values, floored at WCAG AA
    const newBg = u.backgroundColor || s.backgroundColor;
    textKeys.forEach(k=>{
      const{L,C,H}=hexToOklch(s[k]);
      let newL = Math.max(0,Math.min(1,L-d*0.4));
      let hex = oklchToHex(newL,C,H);
      // If contrast drops below AA, clamp
      if(contrastRatio(hex,newBg)<4.5){hex=s[k];}
      u[k]=hex;
    });
    // Accent colors pass through unchanged
    COLOR_KEYS.forEach(k=>{if(!u[k])u[k]=s[k];});
    setTheme(p=>({...p,...u}));
  },[startSnap]);

  const applyIntensity = useCallback(v=>{ startSnap();setIntensityW(v); const s=colorSnap.current,u={}; COLOR_KEYS.forEach(k=>{const{L,C,H}=hexToOklch(s[k]);const newC=Math.max(0,C*(1+v/100));u[k]=oklchToHex(L,newC,H);}); setTheme(p=>({...p,...u})); },[startSnap]);

  const resetW = useCallback(()=>{colorSnap.current=null;setWarmthW(0);setIntensityW(0);setDepthW(0);},[]);

  const activeName = useMemo(()=>saved.find(s=>s.id===activeId)?.name||"Untitled",[saved,activeId]);
  const saveActive = useCallback(()=>{setSaved(p=>p.map(s=>s.id===activeId?{...s,theme:{...theme}}:s));resetW();setVibeFb("Saved!");setTimeout(()=>setVibeFb(""),2000);},[activeId,theme,resetW]);
  const loadTheme = useCallback(id=>{const f=saved.find(s=>s.id===id);if(f){setActiveId(id);setTheme({...f.theme});resetW();}},[saved,resetW]);
  const createNew = useCallback(tmpl=>{const id=_nid++;const b=tmpl?{...tmpl}:{...theme};setSaved(p=>[...p,{id,name:tmpl?.name?`${tmpl.name} Copy`:`Theme ${id}`,theme:b}]);setActiveId(id);setTheme({...b});setShowNew(false);resetW();},[theme,resetW]);
  const del = useCallback(id=>{if(saved.length<=1)return;setSaved(p=>p.filter(s=>s.id!==id));if(activeId===id){const r=saved.filter(s=>s.id!==id);if(r.length){setActiveId(r[0].id);setTheme({...r[0].theme});resetW();}}},[saved,activeId,resetW]);
  const startRename = useCallback(()=>{setEditName(true);setTmpName(activeName);},[activeName]);
  const finishRename = useCallback(()=>{if(tmpName.trim())setSaved(p=>p.map(s=>s.id===activeId?{...s,name:tmpName.trim()}:s));setEditName(false);},[activeId,tmpName]);

  const applyPersonality = useCallback(key=>{
    const p = PERSONALITIES[key]; if(!p) return;
    const {name, desc, ...themeProps} = p;
    setTheme(prev=>({...prev,...themeProps}));
    colorSnap.current=null;
    resetW();
  },[resetW]);

  const submitVibe = useCallback(async()=>{
    if(!vibe.trim()||genning) return;
    if(apiKey.trim()){
      setGenning(true);setVibeFb("Generating...");
      try{const gen=await generateThemeLLM(apiKey.trim(),vibe.trim());setTheme(p=>({...p,...gen}));resetW();setVibeFb("Applied!");setTimeout(()=>setVibeFb(""),3000);}
      catch(e){setVibeFb(`Error: ${e.message}`);setTimeout(()=>setVibeFb(""),5000);}
      finally{setGenning(false);}
      return;
    }
    const{theme:nt,matched}=parseVibe(vibe,DEFAULT_THEME);
    setTheme(p=>({...p,...nt}));resetW();
    setVibeFb(matched===0?"No match. Add API key for AI.":`${matched} matched`);
    setTimeout(()=>setVibeFb(""),4000);
  },[vibe,apiKey,genning,resetW]);

  const sc = SCALE_PRESETS[t.scale]||SCALE_PRESETS.default;
  const sp = useMemo(()=>spacingScale(sc.base,sc.harmony),[sc]);
  const ts = useMemo(()=>typeScale(t.fontSize,t.typeHarmony||"major-third"),[t.fontSize,t.typeHarmony]);
  const expContent = useMemo(()=>{if(exportTab==="css")return generateCSS(t);if(exportTab==="json")return generateJSON(t);return generatePrompt(t);},[t,exportTab]);

  const tabBtn = a => ({padding:"8px 14px",borderRadius:7,border:"none",cursor:"pointer",fontSize:14,fontWeight:500,background:a?c.accent:"transparent",color:a?"#fff":c.muted,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"});

  const previewContent = (
    <>
      {preview==="landing"&&<LandingPreview t={t} w={customWidth}/>}
      {preview==="dash"&&<DashPreview t={t} w={customWidth}/>}
      {preview==="market"&&<MarketPreview t={t} w={customWidth}/>}
      {preview==="components"&&<ComponentShowcase t={t}/>}
    </>
  );

  const fontOpts = cat => FONTS.filter(f=>f.cat===cat||(!cat)).map(f=>({value:f.name,label:f.name,fontFamily:f.value}));
  const bodyOpts = fontOpts().filter(f=>f.value!=="System Default"||true);

  return (
    <div style={{minHeight:"100vh",background:c.bg,fontFamily:"system-ui, -apple-system, sans-serif",color:c.text}}>
      {/* HEADER */}
      <div style={{background:c.surface,borderBottom:`1px solid ${c.border}`,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setSidebar(!sidebar)} style={{width:38,height:38,borderRadius:8,border:`1px solid ${c.border}`,background:c.bg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{sidebar?<ChevronLeft size={16} color={c.muted}/>:<Menu size={16} color={c.muted}/>}</button>
          <div style={{width:34,height:34,borderRadius:8,background:`linear-gradient(135deg, ${c.accent}, ${c.secondary})`,display:"flex",alignItems:"center",justifyContent:"center"}}><Palette size={18} color="#fff"/></div>
          <div><h1 style={{marginTop:0,marginBottom:0,fontSize:18,fontWeight:700}}>LLM Theme Builder</h1><p style={{marginTop:0,marginBottom:0,fontSize:13,color:c.muted}}>OKLCH | Harmonic Scale | Vibe Matrix</p></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {editName?(<input autoFocus value={tmpName} onChange={e=>setTmpName(e.target.value)} onBlur={finishRename} onKeyDown={e=>{if(e.key==="Enter")finishRename()}} style={{fontSize:14,fontWeight:600,color:c.text,background:c.bg,border:`1px solid ${c.accent}`,borderRadius:6,padding:"6px 12px",outline:"none",width:160}}/>):(<span onClick={startRename} style={{fontSize:14,fontWeight:600,color:c.text,cursor:"pointer",padding:"6px 12px",borderRadius:6,border:`1px dashed ${c.border}`}}>{activeName}</span>)}
          <button onClick={()=>{const data=JSON.stringify(theme,null,2);const blob=new Blob([data],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${activeName.replace(/[^a-zA-Z0-9]/g,"-").toLowerCase()}-theme.json`;a.click();URL.revokeObjectURL(url);}} style={{display:"flex",alignItems:"center",gap:4,padding:"8px 14px",borderRadius:6,border:`1px solid ${c.accent}`,background:`${c.accent}22`,color:c.accent,fontSize:13,fontWeight:600,cursor:"pointer"}}><Download size={14}/> Save to Desktop</button>
          <button onClick={()=>setExportOpen(true)} style={{display:"flex",alignItems:"center",gap:4,padding:"8px 16px",borderRadius:6,border:"none",background:c.accent,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}><Download size={14}/> Export</button>
        </div>
      </div>

      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        label:has(input[type="color"]):hover .color-swatch-hover { opacity: 1 !important; }
      `}</style>

      {/* MAIN */}
      <div style={{display:"flex",minHeight:"calc(100vh - 60px)",position:"relative"}}
        onTouchStart={e=>{touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()};}}
        onTouchEnd={e=>{
          if(!touchRef.current)return;
          const dx=e.changedTouches[0].clientX-touchRef.current.x;
          const dy=Math.abs(e.changedTouches[0].clientY-touchRef.current.y);
          const dt=Date.now()-touchRef.current.t;
          if(dt<400&&dy<80){
            if(dx>60&&!sidebar)setSidebar(true);
            if(dx<-60&&sidebar&&isMobile)setSidebar(false);
          }
          touchRef.current=null;
        }}>

        {/* MOBILE BACKDROP */}
        {isMobile&&sidebar&&<div onClick={()=>setSidebar(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:49,transition:"opacity 0.3s"}}/>}

        {/* SIDEBAR */}
        {(sidebar||isMobile)&&(
          <div style={{width:isMobile?"85vw":420,maxWidth:420,flexShrink:0,background:c.surface,borderRight:`1px solid ${c.border}`,overflowY:"auto",maxHeight:"calc(100vh - 70px)",padding:20,display:"flex",flexDirection:"column",gap:20,
            ...(isMobile?{position:"fixed",left:0,top:60,bottom:0,zIndex:50,transform:sidebar?"translateX(0)":"translateX(-100%)",transition:"transform 0.3s ease",boxShadow:sidebar?"8px 0 24px rgba(0,0,0,0.3)":"none"}:{})
          }}>

            {/* Color Mode — top of sidebar so users pick light/dark first */}
            <div>
              <div style={{fontSize:14,fontWeight:600,color:c.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Color Mode</div>
              <div style={{fontSize:12,color:c.muted,marginBottom:8}}>Pick your mode first — this shapes all your colors</div>
              <div style={{display:"flex",gap:5}}>
                {[{id:"both",l:"Both",desc:"Light & dark"},{id:"light-only",l:"Light Only",desc:"Light theme"},{id:"dark-only",l:"Dark Only",desc:"Dark theme"}].map(m=>(
                  <button key={m.id} onClick={()=>{
                    up("colorModePolicy",m.id);
                    // Auto-adjust colors when switching to dark-only or light-only
                    if(m.id==="dark-only"){
                      const bgL = hexToOklch(theme.backgroundColor).L;
                      if(bgL > 0.5){
                        // Currently light — flip to dark defaults
                        const {H} = hexToOklch(theme.accentColor);
                        setTheme(p=>({...p,
                          backgroundColor: oklchToHex(0.12, 0.01, H),
                          surfaceColor: oklchToHex(0.18, 0.01, H),
                          textColor: oklchToHex(0.92, 0.01, H),
                          mutedColor: oklchToHex(0.55, 0.02, H),
                          borderColor: oklchToHex(0.30, 0.01, H),
                          colorModePolicy: "dark-only"
                        }));
                        return;
                      }
                    } else if(m.id==="light-only"){
                      const bgL = hexToOklch(theme.backgroundColor).L;
                      if(bgL < 0.5){
                        // Currently dark — flip to light defaults
                        const {H} = hexToOklch(theme.accentColor);
                        setTheme(p=>({...p,
                          backgroundColor: oklchToHex(0.98, 0.005, H),
                          surfaceColor: oklchToHex(0.99, 0.003, H),
                          textColor: oklchToHex(0.15, 0.01, H),
                          mutedColor: oklchToHex(0.50, 0.02, H),
                          borderColor: oklchToHex(0.88, 0.01, H),
                          colorModePolicy: "light-only"
                        }));
                        return;
                      }
                    }
                  }} style={{flex:1,padding:"10px 8px",borderRadius:6,border:(t.colorModePolicy||"both")===m.id?`2px solid ${c.accent}`:`1px solid ${c.border}`,background:(t.colorModePolicy||"both")===m.id?`${c.accent}22`:"transparent",cursor:"pointer",fontSize:13,fontWeight:(t.colorModePolicy||"both")===m.id?600:400,color:(t.colorModePolicy||"both")===m.id?c.accent:c.text,textAlign:"center"}}>
                    {m.l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{height:1,background:c.border}}/>

            <div style={{height:1,background:c.border}}/>

            {/* Generate + Presets + Randomizer */}
            <div>
              <div style={{fontSize:14,fontWeight:600,color:c.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Generate</div>
              <div style={{display:"flex",alignItems:"center",borderRadius:8,border:`1px solid ${genning?c.accent:c.border}`,background:c.bg,overflow:"hidden",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",flex:1}}>
                  {apiKey?<Brain size={16} color={c.muted}/>:<PenLine size={15} color={c.muted}/>}
                  <input type="text" placeholder={apiKey?"Describe any theme...":"warm, neon, retro..."} value={vibe} onChange={e=>setVibe(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")submitVibe()}} disabled={genning} style={{border:"none",outline:"none",background:"transparent",fontSize:14,color:c.text,width:"100%"}}/>
                </div>
                <button onClick={submitVibe} disabled={!vibe.trim()||genning} style={{width:44,height:44,border:"none",borderLeft:`1px solid ${c.border}`,background:(vibe.trim()&&!genning)?c.accent:`${c.border}44`,color:(vibe.trim()&&!genning)?"#fff":c.muted,cursor:(vibe.trim()&&!genning)?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {genning?<Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>:<Send size={16}/>}
                </button>
              </div>
              {vibeFb&&<div style={{fontSize:13,color:vibeFb.startsWith("Error")?"#EF4444":c.accent,fontWeight:500,marginBottom:6}}>{vibeFb}</div>}

              {/* Randomizer */}
              <button onClick={()=>{setTheme(randomTheme());colorSnap.current=null;setWarmthW(0);setIntensityW(0);setDepthW(0);}} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"9px 14px",borderRadius:7,border:`1px solid ${c.border}`,background:c.bg,color:c.text,fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:10}}><Shuffle size={14}/> Randomize Theme</button>

              {/* Presets */}
              <div style={{fontSize:12,fontWeight:600,color:c.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8}}>Presets</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                {Object.entries(PERSONALITIES).map(([k,p])=>(<button key={k} onClick={()=>applyPersonality(k)} style={{padding:"8px 10px",borderRadius:7,border:`1px solid ${c.border}`,background:c.bg,color:c.text,fontSize:12,fontWeight:500,cursor:"pointer",textAlign:"left"}}>
                  <div style={{fontWeight:600,color:c.accent,fontSize:12}}>{p.name}</div>
                  <div style={{fontSize:10,color:c.muted,lineHeight:1.3}}>{p.desc}</div>
                </button>))}
              </div>
            </div>

            <div style={{height:1,background:c.border}}/>

            {/* Colors */}
            <div>
              <div style={{fontSize:14,fontWeight:600,color:c.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Colors</div>

              {/* Color Picker — pick your brand colors */}
              <div style={{marginBottom:14}}>
                <ColorPicker theme={theme} setTheme={setTheme} up={up} c={c}/>
              </div>

            </div>

            <div style={{height:1,background:c.border}}/>

            {/* Typography */}
            <div>
              <div style={{fontSize:14,fontWeight:600,color:c.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Typography</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div><div style={{fontSize:13,color:c.muted,marginBottom:4}}>Heading Font</div><FontPicker value={t.headingFont} onChange={v=>{loadFont(v);up("headingFont",v)}} c={c} fonts={FONTS}/></div>
                <div><div style={{fontSize:13,color:c.muted,marginBottom:4}}>Body Font</div><FontPicker value={t.bodyFont} onChange={v=>{loadFont(v);up("bodyFont",v)}} c={c} fonts={FONTS}/></div>
                <div>
                  <div style={{fontSize:13,color:c.muted,marginBottom:6}}>Type Scale</div>
                  <div style={{display:"flex",gap:5}}>
                    {[{l:"Compact",h:"minor-third"},{l:"Default",h:"major-third"},{l:"Relaxed",h:"perfect-fourth"},{l:"Dramatic",h:"perfect-fifth"}].map(s=>(
                      <button key={s.h} onClick={()=>up("typeHarmony",s.h)} style={{flex:1,padding:"8px 4px",borderRadius:6,border:(t.typeHarmony||"major-third")===s.h?`2px solid ${c.accent}`:`1px solid ${c.border}`,background:(t.typeHarmony||"major-third")===s.h?`${c.accent}22`:"transparent",cursor:"pointer",fontSize:11,fontWeight:(t.typeHarmony||"major-third")===s.h?600:400,color:(t.typeHarmony||"major-third")===s.h?c.accent:c.muted,textAlign:"center"}}>{s.l}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{height:1,background:c.border}}/>

            {/* Icons — Google Material Symbols */}
            <div>
              <div style={{fontSize:14,fontWeight:600,color:c.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Icons</div>
              {/* Style: Outlined vs Filled */}
              <div style={{fontSize:13,color:c.muted,marginBottom:6}}>Style</div>
              <div style={{display:"flex",gap:5,marginBottom:10}}>
                {[{id:"outlined",l:"Outlined"},{id:"filled",l:"Filled"}].map(s=>{
                  const active = (t.iconStyle||"outlined")===s.id;
                  const isFilled = s.id==="filled";
                  return <button key={s.id} onClick={()=>up("iconStyle",s.id)} style={{flex:1,padding:"10px 8px",borderRadius:6,border:active?`2px solid ${c.accent}`:`1px solid ${c.border}`,background:active?`${c.accent}22`:"transparent",cursor:"pointer",textAlign:"center"}}>
                    <span className="material-symbols-outlined" style={{fontSize:22,color:active?c.accent:c.text,fontVariationSettings:`'FILL' ${isFilled?1:0}, 'wght' ${t.iconWeight||400}, 'opsz' 24`}}>home</span>
                    <div style={{fontSize:11,fontWeight:active?600:400,color:active?c.accent:c.muted,marginTop:2}}>{s.l}</div>
                  </button>;
                })}
              </div>
              {/* Weight */}
              <div style={{fontSize:13,color:c.muted,marginBottom:6}}>Weight</div>
              <div style={{display:"flex",gap:5,marginBottom:10}}>
                {[{id:300,l:"Light"},{id:400,l:"Regular"},{id:600,l:"Bold"}].map(w=>{
                  const active = (t.iconWeight||400)===w.id;
                  const filled = (t.iconStyle||"outlined")==="filled"?1:0;
                  return <button key={w.id} onClick={()=>up("iconWeight",w.id)} style={{flex:1,padding:"10px 8px",borderRadius:6,border:active?`2px solid ${c.accent}`:`1px solid ${c.border}`,background:active?`${c.accent}22`:"transparent",cursor:"pointer",textAlign:"center"}}>
                    <span className="material-symbols-outlined" style={{fontSize:22,color:active?c.accent:c.text,fontVariationSettings:`'FILL' ${filled}, 'wght' ${w.id}, 'opsz' 24`}}>star</span>
                    <div style={{fontSize:11,fontWeight:active?600:400,color:active?c.accent:c.muted,marginTop:2}}>{w.l}</div>
                  </button>;
                })}
              </div>
              {/* Preview strip */}
              <div style={{display:"flex",gap:8,justifyContent:"center",padding:"8px 0",background:c.bg,borderRadius:6,border:`1px solid ${c.border}`}}>
                {["search","settings","favorite","notifications","person","mail","calendar_today","image"].map(icon=>(
                  <span key={icon} className="material-symbols-outlined" style={{fontSize:20,color:c.text,fontVariationSettings:`'FILL' ${(t.iconStyle||"outlined")==="filled"?1:0}, 'wght' ${t.iconWeight||400}, 'opsz' 20`}}>{icon}</span>
                ))}
              </div>
            </div>

            <div style={{height:1,background:c.border}}/>

            {/* Shape & Depth */}
            <div>
              <div style={{fontSize:14,fontWeight:600,color:c.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Shape & Depth</div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>

                {/* Radius — 3 visual options */}
                <div>
                  <div style={{fontSize:13,color:c.muted,marginBottom:6}}>Corners</div>
                  <div style={{display:"flex",gap:5}}>
                    {[{id:"sharp",label:"Sharp",r:2,icon:"┌─"},{id:"rounded",label:"Rounded",r:12,icon:"╭─"},{id:"full",label:"Pill",r:99,icon:"(─"}].map(opt=>{
                      const active = t.borderRadius===opt.r;
                      return <button key={opt.id} onClick={()=>up("borderRadius",opt.r)} style={{flex:1,padding:"10px 8px",borderRadius:opt.r>20?20:opt.r,border:active?`2px solid ${c.accent}`:`1px solid ${c.border}`,background:active?`${c.accent}22`:"transparent",cursor:"pointer",textAlign:"center"}}>
                        <div style={{fontSize:16,fontFamily:"monospace",color:active?c.accent:c.text,marginBottom:2}}>{opt.icon}</div>
                        <div style={{fontSize:11,fontWeight:active?600:400,color:active?c.accent:c.muted}}>{opt.label}</div>
                      </button>;
                    })}
                  </div>
                </div>

                {/* Elevation */}
                <div>
                  <div style={{fontSize:13,color:c.muted,marginBottom:6}}>Elevation</div>
                  <div style={{display:"flex",gap:5}}>
                    {[{id:0,l:"Flat",desc:"No shadows"},{id:1,l:"Subtle",desc:"Soft depth"},{id:2,l:"Raised",desc:"Lifted feel"}].map(e=>{
                      const active = t.elevation===e.id;
                      const demoShadow = elevationShadow([0,1,3][e.id],"#888");
                      return <button key={e.id} onClick={()=>up("elevation",e.id)} style={{flex:1,padding:"10px 8px",borderRadius:6,border:active?`2px solid ${c.accent}`:`1px solid ${c.border}`,background:active?`${c.accent}22`:"transparent",cursor:"pointer",textAlign:"center",boxShadow:demoShadow}}>
                        <div style={{fontSize:12,fontWeight:active?600:400,color:active?c.accent:c.text}}>{e.l}</div>
                        <div style={{fontSize:9,color:active?c.accent:c.muted,marginTop:2}}>{e.desc}</div>
                      </button>;
                    })}
                  </div>
                </div>

                {/* Border Weight */}
                <div>
                  <div style={{fontSize:13,color:c.muted,marginBottom:6}}>Border Weight</div>
                  <div style={{display:"flex",gap:5}}>
                    {[{id:0,l:"None"},{id:1,l:"Thin"},{id:2,l:"Bold"}].map(bw=>{
                      const active = (t.borderWeight||1)===bw.id;
                      return <button key={bw.id} onClick={()=>up("borderWeight",bw.id)} style={{flex:1,padding:"10px 8px",borderRadius:6,border:active?`2px solid ${c.accent}`:`${bw.id||1}px solid ${c.border}`,background:active?`${c.accent}22`:"transparent",cursor:"pointer",textAlign:"center"}}><div style={{fontSize:12,fontWeight:active?600:400,color:active?c.accent:c.text}}>{bw.l}</div></button>;
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div style={{height:1,background:c.border}}/>

            {/* Spacing */}
            <div>
              <div style={{fontSize:14,fontWeight:600,color:c.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:10}}>Spacing</div>
              <div style={{display:"flex",gap:5}}>
                {[{id:"tight",l:"Tight",d:"Dense, compact"},{id:"relaxed",l:"Relaxed",d:"Comfortable"},{id:"dramatic",l:"Dramatic",d:"Lots of room"}].map(s=>(
                  <button key={s.id} onClick={()=>up("scale",s.id)} style={{flex:1,padding:"10px 8px",borderRadius:6,border:(t.scale||"default")===s.id?`2px solid ${c.accent}`:`1px solid ${c.border}`,background:(t.scale||"default")===s.id?`${c.accent}22`:"transparent",cursor:"pointer",textAlign:"center"}}>
                    <div style={{fontSize:12,fontWeight:(t.scale||"default")===s.id?600:400,color:(t.scale||"default")===s.id?c.accent:c.text}}>{s.l}</div>
                    <div style={{fontSize:10,color:c.muted}}>{s.d}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{height:1,background:c.border}}/>

            {/* Motion */}
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{fontSize:14,fontWeight:600,color:c.muted,textTransform:"uppercase",letterSpacing:0.5}}>Motion</div>
                <button onClick={()=>{if(t.motionPreset==="none"){up("motionPreset",lastMotionRef.current)}else{lastMotionRef.current=t.motionPreset;up("motionPreset","none")}}}
                  style={{position:"relative",width:36,height:20,borderRadius:10,border:"none",background:t.motionPreset!=="none"?c.accent:c.border,cursor:"pointer",transition:"background 0.15s",padding:0}}>
                  <div style={{position:"absolute",top:2,left:t.motionPreset!=="none"?18:2,width:16,height:16,borderRadius:8,background:"#fff",transition:"left 0.15s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                </button>
              </div>
              {t.motionPreset!=="none" && (
                <div style={{display:"flex",gap:5}}>
                  {["smooth","bouncy","sharp"].map(k=>{
                    const active = t.motionPreset===k;
                    const mp = MOTION_PRESETS[k];
                    return <button key={k} onClick={()=>up("motionPreset",k)}
                      style={{flex:1,padding:"10px 8px",borderRadius:7,border:active?`2px solid ${c.accent}`:`1px solid ${c.border}`,background:active?`${c.accent}22`:c.bg,cursor:"pointer",textAlign:"center"}}>
                      <div style={{fontSize:12,fontWeight:active?600:400,color:active?c.accent:c.text}}>{mp.name}</div>
                      <div style={{fontSize:10,color:c.muted}}>{mp.desc}</div>
                    </button>;
                  })}
                </div>
              )}
            </div>

            <div style={{height:1,background:c.border}}/>

            {/* Vibe Matrix */}
            <VibeMatrix x={t.vibeX} y={t.vibeY} onChangeX={v=>up("vibeX",v)} onChangeY={v=>up("vibeY",v)} c={c}/>

          </div>
        )}

        {/* PREVIEW AREA */}
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,maxHeight:"calc(100vh - 70px)"}}>
          {/* Page tabs - dark */}
          <div style={{display:"flex",gap:0,background:"#1C1C1E",borderBottom:"1px solid #333",padding:"0 12px",flexShrink:0}}>
            {[{id:"landing",l:"Landing"},{id:"dash",l:"Dashboard"},{id:"market",l:"Market"},{id:"components",l:"Components"}].map(p=>(
              <button key={p.id} onClick={()=>setPreview(p.id)} style={{padding:"12px 16px",border:"none",background:"transparent",color:preview===p.id?"#fff":"#999",fontSize:13,fontWeight:preview===p.id?600:500,cursor:"pointer",borderBottom:preview===p.id?"2px solid #fff":"2px solid transparent",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>{p.l}</button>
            ))}
          </div>
          {/* DevTools toolbar - dark */}
          <div style={{display:"flex",alignItems:"center",gap:12,background:"#2A2A2C",padding:"8px 14px",borderBottom:"1px solid #444",flexShrink:0,flexWrap:"wrap"}}>
            {/* Device dropdown with all DEVICE_PRESETS */}
            <select value={device} onChange={e=>{setDevice(e.target.value);if(e.target.value!=="Custom"){const p=DEVICE_PRESETS.find(d=>d.name===e.target.value);if(p){setCustomWidth(p.w);setCustomHeight(p.h);}}}} style={{padding:"6px 10px",borderRadius:4,border:"1px solid #555",background:"#3C3C3E",color:"#fff",fontSize:12,cursor:"pointer",outline:"none"}}>
              {DEVICE_PRESETS.map(d=>(<option key={d.name} value={d.name}>{d.name}</option>))}
              <option value="Custom">Custom</option>
            </select>
            {/* W + H always visible */}
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:"#999"}}>W:</span>
              <input type="number" min={320} max={1920} value={customWidth} onChange={e=>{setCustomWidth(Number(e.target.value));setDevice("Custom");}} style={{width:60,padding:"6px 8px",borderRadius:4,border:"1px solid #555",background:"#3C3C3E",color:"#fff",fontSize:12,outline:"none"}}/>
              <span style={{fontSize:11,color:"#999"}}>H:</span>
              <input type="number" min={300} max={2000} value={customHeight} onChange={e=>{setCustomHeight(Number(e.target.value));setDevice("Custom");}} style={{width:60,padding:"6px 8px",borderRadius:4,border:"1px solid #555",background:"#3C3C3E",color:"#fff",fontSize:12,outline:"none"}}/>
            </div>
            {/* Light/dark toggle */}
            {(t.colorModePolicy||"both")==="both"&&(
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:11,color:"#999"}}>{relativeLuminance(t.backgroundColor)<0.2?"Dark":"Light"}</span>
                <div onClick={()=>{
                  const isDark = relativeLuminance(t.backgroundColor) < 0.2;
                  if(isDark){up("surfaceColor","#FFFFFF");up("backgroundColor","#FAFAFA");up("textColor","#1A1A1A");up("mutedColor","#6B7280");up("borderColor","#E5E7EB");}
                  else{up("surfaceColor","#1E1B2E");up("backgroundColor","#13111C");up("textColor","#E2E0ED");up("mutedColor","#8B8BA3");up("borderColor","#2D2A42");}
                  colorSnap.current=null;setWarmthW(0);setIntensityW(0);setDepthW(0);
                }} style={{width:36,height:20,borderRadius:10,background:relativeLuminance(t.backgroundColor)<0.2?"#6E56CF":"#555",padding:2,cursor:"pointer",transition:"background 0.2s"}}>
                  <div style={{width:16,height:16,borderRadius:8,background:"#fff",transform:relativeLuminance(t.backgroundColor)<0.2?"translateX(16px)":"translateX(0)",transition:"transform 0.2s"}}/>
                </div>
              </div>
            )}
            {(t.colorModePolicy||"both")!=="both"&&(
              <div style={{marginLeft:"auto",fontSize:11,color:"#777",fontStyle:"italic"}}>
                {t.colorModePolicy==="light-only"?"Light only":"Dark only"}
              </div>
            )}
          </div>
          {/* Canvas */}
          <div style={{flex:1,background:"#3C3C3E",overflowY:"auto",display:"flex",justifyContent:"center",alignItems:"flex-start",padding:"30px 30px 40px 30px"}}>
            <DeviceFrame deviceWidth={customWidth} deviceHeight={customHeight} t={t} onResize={(w,h)=>{setCustomWidth(w);setCustomHeight(h);setDevice("Custom");}}>
              {preview==="components"&&(
                <div style={{background:t.surfaceColor,borderBottom:`1px solid ${t.borderColor}`,padding:`${sp.xs}px ${sp.sm}px`,fontSize:ts.xs,fontWeight:600,color:t.mutedColor,textTransform:"uppercase",letterSpacing:0.5}}>
                  Component Library
                </div>
              )}
              <div style={{flex:1,overflow:"auto"}}>
                {previewContent}
              </div>
            </DeviceFrame>
          </div>
        </div>
      </div>

      {/* EXPORT MODAL */}
      {exportOpen&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
        <div style={{background:c.surface,borderRadius:12,padding:24,width:"90%",maxWidth:680,maxHeight:"85vh",overflow:"auto",boxShadow:"0 20px 25px rgba(0,0,0,0.3)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <h2 style={{marginTop:0,marginBottom:0,fontSize:18,fontWeight:700}}>Export Theme</h2>
            <button onClick={()=>setExportOpen(false)} style={{background:"none",border:"none",color:c.muted,cursor:"pointer",fontSize:20}}><X size={20}/></button>
          </div>
          {/* Recommendation banner */}
          <div style={{background:`${c.accent}15`,border:`1px solid ${c.accent}33`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:12,color:c.text,lineHeight:1.5}}>
            <div style={{fontWeight:700,marginBottom:4,color:c.accent}}>💡 Best practice: Prompt + JSON together</div>
            <div style={{color:c.muted}}>
              For the most accurate implementation, give your LLM <strong style={{color:c.text}}>both</strong> the Prompt (for intent & architecture) and the JSON file (for exact values). The prompt alone may produce approximations since the LLM doesn't have access to this tool's token system.
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {[{id:"css",l:"CSS Vars",d:"Copy into :root"},{id:"json",l:"JSON",d:"Token file"},{id:"prompt",l:"Prompt",d:"For LLMs"}].map(t=>(
              <button key={t.id} onClick={()=>setExportTab(t.id)} style={{...tabBtn(exportTab===t.id),flex:1,flexDirection:"column",alignItems:"center",padding:"8px 4px"}}>
                <span>{t.l}</span>
                <span style={{fontSize:9,opacity:0.7,marginTop:2}}>{t.d}</span>
              </button>
            ))}
            <div style={{flex:"0 0 auto"}}/>
            <CopyBtn text={expContent} c={c}/>
          </div>
          {/* Tab description */}
          <div style={{fontSize:11,color:c.muted,marginBottom:8,lineHeight:1.4}}>
            {exportTab==="css"&&"Paste these CSS custom properties into your stylesheet's :root. All spacing, type, color, and motion tokens included."}
            {exportTab==="json"&&"Save as theme.json and import in your project. Contains the complete token tree — colors, spacing, typography, shape, motion, and voice definitions."}
            {exportTab==="prompt"&&"Feed this to an LLM alongside your JSON file for the best results. Includes the full design system architecture, proportional scaling rules, and voice guidelines."}
          </div>
          <pre style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:8,padding:16,overflow:"auto",maxHeight:"45vh",fontSize:12,color:c.text,fontFamily:"monospace",marginTop:0,marginBottom:0,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
            {expContent}
          </pre>
        </div>
      </div>}
    </div>
  );
}
