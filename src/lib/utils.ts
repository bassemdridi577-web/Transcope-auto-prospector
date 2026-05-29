import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec)))
    .replace(/&[a-z]+;/g, (match) => {
      const entities: Record<string, string> = {
        '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
        '&eacute;': 'é', '&egrave;': 'è', '&agrave;': 'à', '&icirc;': 'î', '&ocirc;': 'ô', '&ucirc;': 'û'
      };
      return entities[match] || match;
    });
}

