import { parseArgs } from "../engine/llm";
import { createZipBlob } from "./zip";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function importedPackagesPure(files: Record<string, string>): string[] {
  const set = new Set<string>();
  for (const [p, c] of Object.entries(files)) {
    if (!/\.(t|j)sx?$/.test(p)) continue;
    // Strip single-line and multi-line comments so commented-out code doesn't trigger package sync
    const clean = c.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
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
    `,
    "src/utils.ts": `
      import { format } from "date-fns";
    `
  };

  const pkgs = importedPackagesPure(files);
  assert(pkgs.includes("motion"), "Should include motion");
  assert(pkgs.includes("date-fns"), "Should include date-fns");
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
