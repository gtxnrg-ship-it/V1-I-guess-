export interface DeviceCapabilityInput {
  /** Browser-reported device memory is an approximate bucket, not measured free RAM. */
  deviceMemory?: number;
  /** Logical CPU count may be capped by the browser for privacy or performance. */
  hardwareConcurrency?: number;
  userAgent?: string;
}

export interface DeviceCapabilities {
  reportedRamGb: number | null;
  logicalCores: number | null;
  isLikelyMobile: boolean;
}

export function readDeviceCapabilities(input: DeviceCapabilityInput): DeviceCapabilities {
  const reportedRamGb = typeof input.deviceMemory === "number"
    && Number.isFinite(input.deviceMemory)
    && input.deviceMemory > 0
    ? input.deviceMemory
    : null;
  const logicalCores = typeof input.hardwareConcurrency === "number"
    && Number.isFinite(input.hardwareConcurrency)
    && Number.isInteger(input.hardwareConcurrency)
    && input.hardwareConcurrency > 0
    ? input.hardwareConcurrency
    : null;

  return {
    reportedRamGb,
    logicalCores,
    isLikelyMobile: /Android|iPhone|iPad|iPod|Mobile/i.test(input.userAgent ?? ""),
  };
}
