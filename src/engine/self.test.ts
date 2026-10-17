import { DEFAULT_SELF_REPO, selfRepo } from "./self";
if (DEFAULT_SELF_REPO !== "gtxnrg-ship-it/kuro-chan") throw new Error("The self-upgrade default must target the current Kuro-chan repository.");
if (selfRepo() !== DEFAULT_SELF_REPO) throw new Error("Without an explicit override, self-upgrades must resolve to the current Kuro-chan repository.");
console.log("Self-upgrade target tests passed");
