// Single source of truth for the Gangrey brand palette. Every component pulls
// its colors from here so the five approved colors can never drift apart across
// files. Change a value here and the whole site + CMS follow.
export const CRIMSON = "#490000";
export const INK = "#000000";
export const EARTH = "#392a22";
export const RULE = "#b8b8ba";
export const PAPER = "#ffffff";

// Semantic aliases — kept so existing component code reads naturally.
export const TEXT_DARK = INK;
export const TEXT_MUTED = EARTH;
export const BORDER = RULE;
export const LINE = RULE;
export const CREAM = PAPER;
export const PAPER_DARK = PAPER;
