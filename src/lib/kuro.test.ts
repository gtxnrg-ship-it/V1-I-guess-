import { parseArgs } from "../engine/llm";
import { createZipBlob } from "./zip";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function stripComments(source: string): string {
  let out = ""; let quote = 0; let escaped = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source.charCodeAt(i), next = source.charCodeAt(i + 1);
    if (quote) { out += source[i]; if (escaped) escaped = false; else if (ch === 92) escaped = true; else if (ch === quote) quote = 0; continue; }
    if (ch === 39 || ch === 34 || ch === 96) { quote = ch; out += source[i]; continue; }
    if (ch === 47 && next === 47) { while (i < source.length && source[i] !== "\n") { out += " "; i++; } if (i < source.length) out += "\n"; continue; }
    if (ch === 47 && next === 42) { out += "  "; i += 2; while (i < source.length && !(source.charCodeAt(i) === 42 && source.charCodeAt(i + 1) === 47)) { out += source[i] === "\n" ? "\n" : " "; i++; } if (i < source.length) { out += "  "; i++; } continue; }
    out += source[i];
  }
  return out;
}


function importedPackagesPure(files: Record<string, string>): string[] {
  const set = new Set<string>();
  for (const [p, c] of Object.entries(files)) {
    if (!/\.(t|j)sx?$/.test(p)) continue;
    // Mirror source behavior: preserve quoted strings while removing comments.
    const clean = stripComments(c);
    for (const m of clean.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const s = m[1] || m[2] || m[3];
      if (!s || s.startsWith(".") || s.startsWith("/") || s.startsWith("@/") || /^https?:/.test(s)) continue;
      set.add(s.startsWith("@") ? s.split("/").slice(0, 2).join("/") : s.split("/")[0]);
    }
  }
  return [...set];
}

function testParseArgs() {
  console.log("Testing parseArgs...");

  // Valid JSON
  const valid = parseArgs('{"key": "value", "num": 123}');
  assert(valid.key === "value" && valid.num === 123, "Valid JSON should parse correctly");

  // Trailing commas
  const trailing = parseArgs('{"key": "value",}');
  assert(trailing.key === "value", "Trailing comma should be repaired");

  // Unclosed JSON string / object
  const unclosed = parseArgs('{"key": "value"');
  assert(unclosed.key === "value", "Unclosed JSON object should be repaired");

  // Codeblock formatting
  const codeblock = parseArgs('```json\n{"hello": "world"}\n```');
  assert(codeblock.hello === "world", "Codeblocks should be stripped");

  console.log("✓ parseArgs tests passed");
}

function testImportedPackages() {
  console.log("Testing importedPackages...");

  const files = {
    "src/App.tsx": `
      import React from "react";
      import { Button } from "@/components/ui/button";
      import { motion } from "motion/react";
      import { useState } from 'react';
      // import { dummy } from "dummy-pkg";
      /* import { unused } from "unused-pkg"; */
      import "tailwindcss/tailwind.css";
      const endpoint = "https://example.com/api"; import { client } from "url-safe-pkg";
      const commentLike = "text /* not a comment */"; import { second } from "second-pkg";
    `,
    "src/utils.ts": `
      import { format } from "date-fns";
    `
  };

  const pkgs = importedPackagesPure(files);
  assert(pkgs.includes("motion"), "Should include motion");
  assert(pkgs.includes("date-fns"), "Should include date-fns");
  assert(pkgs.includes("url-safe-pkg"), "A URL string must not hide a later import on the same line");
  assert(pkgs.includes("second-pkg"), "Comment-like text inside strings must not hide later imports");
  assert(!pkgs.includes("dummy-pkg"), "Should exclude single-line commented imports");
  assert(!pkgs.includes("unused-pkg"), "Should exclude multi-line commented imports");

  console.log("✓ importedPackages tests passed");
}

function testCreateZipBlob() {
  console.log("Testing createZipBlob...");

  const files = {
    "index.html": "<!doctype html><html></html>",
    "src/main.tsx": 'console.log("hello world");'
  };

  const blob = createZipBlob(files);
  assert(blob instanceof Blob, "Should return a Blob instance");
  assert(blob.type === "application/zip", "Blob type should be application/zip");
  assert(blob.size > 0, "Blob size should be greater than 0");

  console.log("✓ createZipBlob tests passed");
}

function runAll() {
  try {
    testParseArgs();
    testImportedPackages();
    testCreateZipBlob();
    console.log("\nALL TESTS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("\nTEST FAILURE:", err);
    process.exit(1);
  }
}

runAll();
