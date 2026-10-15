import { parseArgs } from "../engine/llm";
import { createZipBlob } from "./zip";
import { importedPackages } from "../engine/package-imports";
import { starterFiles } from "../engine/template";
import { GH, b64, unb64 } from "../engine/github";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function testParseArgs() {
  console.log("Testing parseArgs...");

  const valid = parseArgs('{"key": "value", "num": 123}');
  assert(valid.key === "value" && valid.num === 123, "Valid JSON should parse correctly");

  const trailing = parseArgs('{"key": "value",}');
  assert(trailing.key === "value", "Trailing comma should be repaired");

  const unclosed = parseArgs('{"key": "value"');
  assert(unclosed.key === "value", "Unclosed JSON object should be repaired");

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

  const pkgs = importedPackages(files);
  assert(pkgs.includes("motion"), "Should include motion");
  assert(pkgs.includes("date-fns"), "Should include date-fns");
  assert(pkgs.includes("url-safe-pkg"), "A URL string must not hide a later import on the same line");
  assert(pkgs.includes("second-pkg"), "Comment-like text inside strings must not hide later imports");
  assert(!pkgs.includes("dummy-pkg"), "Should exclude single-line commented imports");
  assert(!pkgs.includes("unused-pkg"), "Should exclude multi-line commented imports");

  console.log("✓ importedPackages tests passed");
}

function testGeneratedReadme() {
  console.log("Testing generated project README...");

  const files = starterFiles("Demo App");
  assert(files["README.md"].includes("# Demo App"), "README should include the generated app name");
  assert(files["README.md"].includes("npm run dev"), "README should explain local development");
  assert(files["README.md"].includes("npm run build"), "README should explain production builds");
  assert(files["README.md"].includes("VITE_"), "README should warn that VITE variables are public");
  assert(files[".gitignore"].includes(".env"), "Generated projects should ignore local environment files");
  assert(files[".gitignore"].includes("!.env.example"), "Generated projects should allow safe env examples");

  console.log("✓ generated README tests passed");
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

function testGitHubBase64RoundTrip() {
  console.log("Testing GitHub content encoding...");

  const samples = [
    "",
    "plain ASCII",
    "Unicode: বাংলা 日本語 🎉",
    "Line one\nLine two\n",
    "symbols: <>&/'\""
  ];

  for (const sample of samples) {
    assert(unb64(b64(sample)) === sample, "GitHub content encoding should preserve text exactly");
  }

  console.log("✓ GitHub content encoding tests passed");
}

async function testGitHubApiErrors() {
  console.log("Testing GitHub API error handling...");

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => new Response(
      JSON.stringify({ message: "Bad credentials" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )) as typeof fetch;

    const client = new GH("test-token");
    let message = "";
    try {
      await client.ok("GET", "/user");
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    assert(
      message.includes("GitHub GET /user → 401: Bad credentials"),
      "GitHub API failures should include method, path, status, and API message"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log("✓ GitHub API error handling tests passed");
}


async function testGitHubCommitRejectsMovedBranch() {
  console.log("Testing concurrent GitHub publish protection...");

  class MovingHeadGH extends GH {
    headCalls = 0;
    writes: string[] = [];
    async headSha(): Promise<string | null> {
      this.headCalls++;
      return this.headCalls === 1 ? "parent-sha" : "newer-remote-sha";
    }
    async ok(method: string, path: string): Promise<any> {
      this.writes.push(method + " " + path);
      if (path === "/repos/owner/repo/git/commits/parent-sha") return { tree: { sha: "base-tree" } };
      if (path === "/repos/owner/repo/git/trees") return { sha: "new-tree" };
      if (path === "/repos/owner/repo/git/commits") return { sha: "new-commit" };
      throw new Error("Unexpected mocked GitHub request: " + method + " " + path);
    }
  }

  const client = new MovingHeadGH("test-token");
  let message = "";
  try {
    await client.commitFiles("owner", "repo", "main", [{ path: "src/App.tsx", content: "new code" }], "test publish");
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }

  assert(message.includes("repository changed while preparing this publish"), "A moving remote branch should stop the publish");
  assert(!client.writes.some((w) => w.includes("/git/refs/heads/main")), "A stale publish must not move the remote branch ref");
  console.log("✓ concurrent GitHub publish protection tests passed");
}

async function runAll() {
  try {
    testParseArgs();
    testImportedPackages();
    testGeneratedReadme();
    testCreateZipBlob();
    testGitHubBase64RoundTrip();
    await testGitHubApiErrors();
    await testGitHubCommitRejectsMovedBranch();
    console.log("\nALL TESTS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("\nTEST FAILURE:", err);
    process.exit(1);
  }
}

void runAll();
