import { DEFAULT_SELF_REPO, resolveSelfRepo } from "./self-repo";
if (DEFAULT_SELF_REPO !== "gtxnrg-ship-it/kuro-chan") throw new Error("The self-upgrade default must target the current Kuro-chan repository.");
if (resolveSelfRepo() !== DEFAULT_SELF_REPO) throw new Error("Without an explicit override, self-upgrades must resolve to the current Kuro-chan repository.");
if (resolveSelfRepo("https://github.com/acme/demo.git") !== "acme/demo") throw new Error("Self-upgrade repository URLs must normalize without changing the selected repository.");
console.log("Self-upgrade target tests passed");
