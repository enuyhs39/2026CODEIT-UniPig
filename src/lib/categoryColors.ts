import type { PaletteColor } from "@/generated/prisma/enums";

export const PALETTE_COLORS: PaletteColor[] = [
  "DEFAULT",
  "GRAY",
  "BROWN",
  "ORANGE",
  "YELLOW",
  "GREEN",
  "BLUE",
  "PURPLE",
  "PINK",
  "RED",
];

export const PALETTE_LABEL: Record<PaletteColor, string> = {
  DEFAULT: "기본",
  GRAY: "회색",
  BROWN: "갈색",
  ORANGE: "주황색",
  YELLOW: "노란색",
  GREEN: "초록색",
  BLUE: "파란색",
  PURPLE: "보라색",
  PINK: "분홍색",
  RED: "빨간색",
};

// Tailwind가 클래스를 정적으로 스캔할 수 있도록 리터럴 문자열로 매핑한다.
export const PALETTE_BADGE_CLASSES: Record<PaletteColor, string> = {
  DEFAULT: "bg-tag-default-bg text-tag-default-text",
  GRAY: "bg-tag-gray-bg text-tag-gray-text",
  BROWN: "bg-tag-brown-bg text-tag-brown-text",
  ORANGE: "bg-tag-orange-bg text-tag-orange-text",
  YELLOW: "bg-tag-yellow-bg text-tag-yellow-text",
  GREEN: "bg-tag-green-bg text-tag-green-text",
  BLUE: "bg-tag-blue-bg text-tag-blue-text",
  PURPLE: "bg-tag-purple-bg text-tag-purple-text",
  PINK: "bg-tag-pink-bg text-tag-pink-text",
  RED: "bg-tag-red-bg text-tag-red-text",
};

export const PALETTE_DOT_CLASSES: Record<PaletteColor, string> = {
  DEFAULT: "bg-tag-default-text",
  GRAY: "bg-tag-gray-text",
  BROWN: "bg-tag-brown-text",
  ORANGE: "bg-tag-orange-text",
  YELLOW: "bg-tag-yellow-text",
  GREEN: "bg-tag-green-text",
  BLUE: "bg-tag-blue-text",
  PURPLE: "bg-tag-purple-text",
  PINK: "bg-tag-pink-text",
  RED: "bg-tag-red-text",
};
