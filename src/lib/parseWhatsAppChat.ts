import type { ChatMessage } from "../types";
import { MEDIA_EXTENSIONS } from "./zipUtils";

// Invisible directionality/formatting marks WhatsApp likes to sprinkle around
// timestamps and sender names (LRM, RLM, ZWSP, BOM, LRE/PDF).
const INVISIBLE_CHARS = /[‎‏​﻿‪‫‬]/g;

function stripInvisible(input: string): string {
  return input.replace(INVISIBLE_CHARS, "").trim();
}

const DASH = "[-\\u2013\\u2014]";
const DATE = "(\\d{1,4}[./-]\\d{1,2}[./-]\\d{1,4})";
const TIME = "(\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\s?[AaPp]\\.?[Mm]\\.?)?)";

// [12/05/2026, 18:43:20] Mom: text  (iOS style)
const BRACKET_LINE = new RegExp(`^\\[${DATE},\\s?${TIME}\\]\\s?(.*)$`);
// 12/05/2026, 18:43 - Mom: text  (Android style)
const DASH_LINE = new RegExp(`^${DATE},\\s?${TIME}\\s${DASH}\\s(.*)$`);

const SENDER_TEXT = /^([^\n:]{1,60}?):\s([\s\S]*)$/;

const ATTACHED_PATTERN = /<\s*(?:attached|מצורף)\s*:\s*([^>]+)>/i;

const RAW_FILENAME_PATTERN = new RegExp(
  `([\\w\\-]+\\.(?:${MEDIA_EXTENSIONS.join("|")}))`,
  "gi"
);

type LineMatch = {
  dateRaw: string;
  timeRaw: string;
  rest: string;
};

function matchTimestampLine(line: string): LineMatch | null {
  const cleaned = stripInvisible(line);
  const bracketMatch = cleaned.match(BRACKET_LINE);
  if (bracketMatch) {
    return { dateRaw: bracketMatch[1], timeRaw: bracketMatch[2], rest: bracketMatch[3] };
  }
  const dashMatch = cleaned.match(DASH_LINE);
  if (dashMatch) {
    return { dateRaw: dashMatch[1], timeRaw: dashMatch[2], rest: dashMatch[3] };
  }
  return null;
}

function parseTimestamp(dateRaw: string, timeRaw: string): Date | undefined {
  const parts = dateRaw.split(/[./-]/).map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return undefined;

  let day: number, month: number, year: number;
  // WhatsApp defaults to DD/MM/YYYY; only deviate when the first segment
  // can't possibly be a day (i.e. it's a 4-digit year, e.g. 2026/05/12).
  if (parts[0] > 31) {
    [year, month, day] = parts;
  } else {
    [day, month, year] = parts;
  }
  if (year < 100) year += 2000;

  const timeMatch = timeRaw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s?([AaPp])?\.?[Mm]?\.?/);
  if (!timeMatch) return undefined;
  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
  const meridiem = timeMatch[4]?.toLowerCase();
  if (meridiem === "p" && hours < 12) hours += 12;
  if (meridiem === "a" && hours === 12) hours = 0;

  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function extractMediaFilenames(text: string): { filenames: string[]; cleanedText: string } {
  const filenames: string[] = [];
  let cleanedText = text;

  const attachedMatch = text.match(ATTACHED_PATTERN);
  if (attachedMatch) {
    filenames.push(normalizeFilename(attachedMatch[1]));
    cleanedText = cleanedText.replace(ATTACHED_PATTERN, "").trim();
  }

  const rawMatches = text.matchAll(RAW_FILENAME_PATTERN);
  for (const match of rawMatches) {
    const normalized = normalizeFilename(match[1]);
    if (!filenames.includes(normalized)) {
      filenames.push(normalized);
    }
    cleanedText = cleanedText.replace(match[0], "").trim();
  }

  return { filenames, cleanedText: cleanedText.trim() };
}

export function normalizeFilename(filename: string): string {
  return stripInvisible(filename).trim();
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `msg-${idCounter}-${Date.now().toString(36)}`;
}

export function parseWhatsAppChat(chatText: string): ChatMessage[] {
  const lines = chatText.split(/\r\n|\r|\n/);
  const messages: ChatMessage[] = [];
  let current: ChatMessage | null = null;

  for (const line of lines) {
    if (line.trim() === "") {
      if (current) {
        current.text += "\n";
      }
      continue;
    }

    const match = matchTimestampLine(line);
    if (match) {
      if (current) {
        finalizeMessage(current);
        messages.push(current);
      }

      const senderMatch = match.rest.match(SENDER_TEXT);
      let sender: string | undefined;
      let text: string;
      let isSystemMessage = false;

      if (senderMatch) {
        sender = stripInvisible(senderMatch[1]);
        text = senderMatch[2];
      } else {
        text = match.rest;
        isSystemMessage = true;
      }

      current = {
        id: nextId(),
        dateRaw: match.dateRaw,
        timeRaw: match.timeRaw,
        timestamp: parseTimestamp(match.dateRaw, match.timeRaw),
        sender,
        text,
        mediaFilenames: [],
        isSystemMessage,
      };
    } else if (current) {
      // Continuation of a multi-line message.
      current.text += (current.text ? "\n" : "") + stripInvisible(line);
    }
    // Lines before any timestamp is found are dropped (e.g. stray headers).
  }

  if (current) {
    finalizeMessage(current);
    messages.push(current);
  }

  return messages;
}

function finalizeMessage(message: ChatMessage): void {
  const { filenames, cleanedText } = extractMediaFilenames(message.text);
  message.mediaFilenames = filenames;
  message.text = cleanedText.trim();
}
