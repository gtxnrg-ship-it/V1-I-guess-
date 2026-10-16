import { parseArgs } from "../engine/llm";
import { createZipBlob } from "./zip";
import { importedPackages } from "../engine/package-imports";
import { starterFiles } from "../engine/template";
import { GH, b64, unb64 } from "../engine/github";
import { shipFiles } from "../engine/ship";

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



async function testGitHubPublishTransaction() {
  console.log("Testing successful GitHub publish transaction with a mocked API...");

  const originalFetch = globalThis.fetch;
  const requests: { method: string; path: string; body: any }[] = [];
  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = init?.method || "GET";
      const path = url.pathname + url.search;
      let body: any = null;
      if (typeof init?.body === "string") body = JSON.parse(init.body);
      requests.push({ method, path, body });

      let status = 200;
      let payload: any = {};
      if (method === "GET" && path.endsWith("/git/ref/heads/main")) {
        payload = { object: { sha: "parent-sha" } };
      } else if (method === "GET" && path.endsWith("/git/commits/parent-sha")) {
        payload = { tree: { sha: "base-tree" } };
      } else if (method === "POST" && path.endsWith("/git/trees")) {
        payload = { sha: "new-tree-sha" };
      } else if (method === "POST" && path.endsWith("/git/commits")) {
        payload = { sha: "new-commit-sha" };
      } else if (method === "PATCH" && path.endsWith("/git/refs/heads/main")) {
        payload = { ref: "refs/heads/main" };
      } else {
        status = 500;
        payload = { message: "Unexpected mocked request: " + method + " " + path };
      }
      return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;

    const client = new GH("mock-token");
    const result = await client.commitFiles(
      "owner",
      "repo",
      "main",
      [{ path: "src/App.tsx", content: "export default function App(){ return <h1>Built</h1> }" }],
      "Build app"
    );

    assert(result.sha === "new-commit-sha", "Publish should return the newly created commit SHA");
    assert(result.url.endsWith("/commit/new-commit-sha"), "Publish should return a direct commit URL");

    const treeRequest = requests.find((r) => r.method === "POST" && r.path.endsWith("/git/trees"));
    assert(treeRequest?.body.base_tree === "base-tree", "Incremental publish should preserve the existing repository tree");
    assert(treeRequest?.body.tree?.[0]?.path === "src/App.tsx", "Publish should send the intended source file");
    assert(treeRequest?.body.tree?.[0]?.content.includes("<h1>Built</h1>"), "Publish should send the complete source content");

    const commitRequest = requests.find((r) => r.method === "POST" && r.path.endsWith("/git/commits"));
    assert(commitRequest?.body.parents?.[0] === "parent-sha", "New commit should retain the original commit as its parent");

    const moveRef = requests.find((r) => r.method === "PATCH" && r.path.endsWith("/git/refs/heads/main"));
    assert(moveRef?.body.sha === "new-commit-sha", "Publish should move the branch to the new commit");
    assert(moveRef?.body.force === false, "Publish must not force-push over repository history");

    console.log("✓ successful GitHub publish transaction tests passed");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function testShipArtifacts() {
  console.log("Testing website and Android delivery artifacts...");
  const shipped = shipFiles("Demo App", "owner/demo-app");
  assert(shipped.files[".github/workflows/deploy-website.yml"].includes("actions/deploy-pages@v4"), "Ship output should include a GitHub Pages deployment workflow");
  assert(shipped.files[".github/workflows/build-android.yml"].includes("assembleDebug"), "Ship output should include an Android APK build");
  assert(shipped.files["capacitor.config.json"].includes("com.kurochan.demoapp"), "Ship output should include a stable Capacitor app ID");
  assert(shipped.files["public/download.html"].includes(shipped.apk), "Android download page should link to the expected APK release");
  assert(shipped.site === "https://owner.github.io/demo-app/", "Ship output should return the expected website URL");
  console.log("✓ website and Android delivery artifact tests passed");
}

async function testGitHubRejectsNonRootRepositoryUrls() {
  console.log("Testing GitHub repository input validation...");
  const client = new GH("test-token");
  let message = "";
  try {
    await client.ensureRepo("https://github.com/owner/repo/tree/main/src");
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert(message.includes("repository URL"), "Branch/file URLs should receive a clear repository-root hint");
  console.log("✓ GitHub repository input validation tests passed");
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
    await testGitHubPublishTransaction();
    testShipArtifacts();
    await testGitHubRejectsNonRootRepositoryUrls();
    console.log("\nALL TESTS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("\nTEST FAILURE:", err);
    process.exit(1);
  }
}

void runAll();
