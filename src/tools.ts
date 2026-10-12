import {
  generateTheme,
  generateCssVariables,
  generateScssVariables,
  generateTailwindConfig,
  generateDtcgTokens,
  generateShadcnTheme,
  generatePandaConfig,
  generateFigmaVariables,
  generateFlutterTheme,
  generateSwiftUITheme,
  simulateTheme,
  parseThemeJSON,
  adjustTheme,
} from "salt-theme-gen";
import type {
  GeneratedTheme,
  ColorBlindnessType,
  ThemeOverrides,
} from "salt-theme-gen";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// ─── Tool Definitions ────────────────────────────────────────────────

export const TOOL_DEFINITIONS: Tool[] = [
  {
    name: "generate_theme",
    description:
      "Generate a complete light+dark design system from a hex color or preset name. " +
      "Returns a GeneratedTheme JSON with 26 semantic colors, tonal palettes, state colors, " +
      "surface elevations, typography, spacing, and WCAG/APCA contrast reports.",
    inputSchema: {
      type: "object",
      properties: {
        primary:   { type: "string", description: "Hex color seed, e.g. '#6366f1'" },
        preset:    { type: "string", description: "Named preset: 'peacock', 'ocean', 'forest', 'sunset', 'cherry-blossom', 'arctic', 'desert', 'lavender', 'emerald', 'coral-reef', 'midnight', 'autumn', 'rose-gold', 'sapphire', 'mint', 'volcano', 'twilight', 'honey', 'storm', 'aurora'" },
        harmony:   { type: "string", description: "Color harmony: 'analogous', 'complementary', 'triadic', 'split-complementary', 'tetradic', 'monochromatic'" },
        spacing:   { type: "string", description: "Spacing preset: 'compact', 'comfortable', 'spacious', 'touch'" },
        radius:    { type: "string", description: "Radius preset: 'sharp', 'rounded', 'smooth', 'pill'" },
        fontSize:  { type: "string", description: "Font size preset: 'small', 'medium', 'large', 'editorial'" },
        baseFont:  { type: "number", description: "Base font size in px (default 16)" },
        fontScale: { type: "number", description: "Modular type scale ratio (default 1.25)" },
      },
    },
  },
  {
    name: "export_theme",
    description:
      "Convert a GeneratedTheme to a specific output format. " +
      "Returns the formatted string ready to write to a file.",
    inputSchema: {
      type: "object",
      required: ["theme", "format"],
      properties: {
        theme:  { type: "object", description: "A GeneratedTheme JSON object" },
        format: {
          type: "string",
          enum: ["css", "scss", "tailwind", "dtcg", "shadcn", "panda", "figma", "flutter", "swiftui"],
          description: "Output format",
        },
        mode: {
          type: "string",
          enum: ["both", "light", "dark"],
          description: "For css/scss: which mode to emit (default: both). 'light'/'dark' produce a standalone :root{} block.",
        },
      },
    },
  },
  {
    name: "adjust_theme",
    description:
      "Apply overrides (colors, tokens) to an existing theme. " +
      "Use 'both' for changes that apply to both modes, or 'light'/'dark' for mode-specific overrides.",
    inputSchema: {
      type: "object",
      required: ["theme", "overrides"],
      properties: {
        theme:     { type: "object", description: "A GeneratedTheme JSON object" },
        overrides: {
          type: "object",
          description: "ThemeOverrides: { both?: { colors? }, light?: { colors? }, dark?: { colors? }, tokens?: { spacing?, radius?, ... } }",
        },
      },
    },
  },
  {
    name: "simulate_cvd",
    description:
      "Simulate how a theme appears to someone with a color vision deficiency. " +
      "Returns a modified GeneratedTheme with WCAG/APCA reports recomputed on the simulated colors — " +
      "use this to verify a theme remains accessible under simulation.",
    inputSchema: {
      type: "object",
      required: ["theme", "type"],
      properties: {
        theme: { type: "object", description: "A GeneratedTheme JSON object" },
        type:  {
          type: "string",
          enum: ["protanopia", "deuteranopia", "tritanopia", "protanomaly", "deuteranomaly", "tritanomaly", "achromatopsia"],
          description: "Color vision deficiency type",
        },
      },
    },
  },
  {
    name: "validate_theme",
    description:
      "Validate a GeneratedTheme JSON object. " +
      "Returns { valid, errors, warnings } — shape errors are captured as errors, " +
      "value issues (negative sizes, small touch targets, etc.) as warnings.",
    inputSchema: {
      type: "object",
      required: ["theme"],
      properties: {
        theme: { type: "object", description: "A GeneratedTheme JSON object to validate" },
      },
    },
  },
  {
    name: "push_to_figma",
    description:
      "Generate Figma Variables from a theme and push them to a Figma file via the REST API " +
      "(PATCH /v1/files/{fileId}/variables). Requires a Figma personal access token and a " +
      "Professional or Organization plan (Figma Variables API is not available on Starter).",
    inputSchema: {
      type: "object",
      required: ["theme", "fileId", "accessToken"],
      properties: {
        theme:           { type: "object",  description: "A GeneratedTheme JSON object" },
        fileId:          { type: "string",  description: "Figma file ID (from the URL: figma.com/file/<fileId>/...)" },
        accessToken:     { type: "string",  description: "Figma personal access token (Settings → Account → Personal access tokens)" },
        includePalettes: { type: "boolean", description: "Include tonal palette steps as variables (default: false)" },
      },
    },
  },
];

// ─── Response Helpers ────────────────────────────────────────────────

function ok(content: unknown) {
  const text = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  return { content: [{ type: "text" as const, text }] };
}

function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

// ─── Tool Router ─────────────────────────────────────────────────────

export async function handleTool(
  name: string,
  args: Record<string, unknown>,
) {
  try {
    switch (name) {

      case "generate_theme": {
        const theme = generateTheme({
          primary:   args.primary   as string | undefined,
          preset:    args.preset    as string | undefined as any,
          harmony:   args.harmony   as string | undefined as any,
          spacing:   args.spacing   as string | undefined as any,
          radius:    args.radius    as string | undefined as any,
          fontSize:  args.fontSize  as string | undefined as any,
          baseFont:  args.baseFont  as number | undefined,
          fontScale: args.fontScale as number | undefined,
        });
        return ok(theme);
      }

      case "export_theme": {
        const theme  = loadTheme(args.theme);
        const format = args.format as string;
        const mode   = (args.mode as string | undefined) ?? "both";
        return ok(applyFormat(theme, format, mode));
      }

      case "adjust_theme": {
        const theme    = loadTheme(args.theme);
        const adjusted = adjustTheme(theme, args.overrides as ThemeOverrides);
        return ok(adjusted);
      }

      case "simulate_cvd": {
        const theme     = loadTheme(args.theme);
        const simulated = simulateTheme(theme, args.type as ColorBlindnessType);
        return ok(simulated);
      }

      case "validate_theme": {
        try {
          const { tokenWarnings } = parseThemeJSON(args.theme as object);
          const errors   = tokenWarnings.filter(w => w.severity === "error");
          const warnings = tokenWarnings.filter(w => w.severity === "warning");
          return ok({
            valid:    errors.length === 0,
            errors:   errors.map(w => ({ path: w.path, message: w.message })),
            warnings: warnings.map(w => ({ path: w.path, message: w.message })),
          });
        } catch (e) {
          return ok({
            valid:    false,
            errors:   [{ path: "", message: (e as Error).message }],
            warnings: [],
          });
        }
      }

      case "push_to_figma": {
        const theme           = loadTheme(args.theme);
        const fileId          = args.fileId      as string;
        const accessToken     = args.accessToken as string;
        const includePalettes = args.includePalettes as boolean | undefined;

        const { payload } = generateFigmaVariables(theme, { includePalettes });

        const res = await fetch(
          `https://api.figma.com/v1/files/${fileId}/variables`,
          {
            method:  "PATCH",
            headers: {
              "X-Figma-Token": accessToken,
              "Content-Type":  "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        if (!res.ok) {
          const body = await res.text();
          return fail(`Figma API error ${res.status}: ${body}`);
        }

        const responseBody = await res.json() as Record<string, unknown>;
        return ok({ success: true, status: res.status, ...responseBody });
      }

      default:
        return fail(`Unknown tool: "${name}"`);
    }
  } catch (e) {
    return fail((e as Error).message);
  }
}

// ─── Internal Helpers ────────────────────────────────────────────────

function loadTheme(raw: unknown): GeneratedTheme {
  const { theme } = parseThemeJSON(raw as object);
  return theme;
}

function applyFormat(theme: GeneratedTheme, format: string, mode: string): string {
  switch (format) {
    case "css": {
      const r = generateCssVariables(theme);
      return mode === "light" ? r.lightRoot : mode === "dark" ? r.darkRoot : r.css;
    }
    case "scss": {
      const r = generateScssVariables(theme);
      return mode === "light" ? r.light : mode === "dark" ? r.dark : r.scss;
    }
    case "tailwind": return generateTailwindConfig(theme).json;
    case "dtcg":     return generateDtcgTokens(theme).json;
    case "shadcn":   return generateShadcnTheme(theme).css;
    case "panda":    return generatePandaConfig(theme).json;
    case "figma":    return generateFigmaVariables(theme).json;
    case "flutter":  return generateFlutterTheme(theme).dart;
    case "swiftui":  return generateSwiftUITheme(theme).swift;
    default: throw new Error(`Unknown format: "${format}"`);
  }
}
