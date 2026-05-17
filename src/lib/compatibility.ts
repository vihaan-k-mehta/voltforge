import { Part, PartCategory } from "@/store/useConfiguratorStore";

export type CompatibilitySeverity = 'error' | 'warning' | 'info';

export interface CompatibilityIssue {
  severity: CompatibilitySeverity;
  message: string;
  relatedCategories: PartCategory[];
}

export function evaluateCompatibility(parts: Record<PartCategory, Part | null>): CompatibilityIssue[] {
  const issues: CompatibilityIssue[] = [];

  const frame = parts.frame;
  const motor = parts.motor;
  const battery = parts.battery;
  const controller = parts.controller;

  // 1. Frame & Motor Mount Compatibility
  if (frame && motor) {
    const frameMount = frame.specs?.mount_type as string;
    const motorMount = motor.specs?.mount_type as string;

    if (frameMount && motorMount && frameMount !== motorMount) {
      issues.push({
        severity: 'error',
        message: `Motor mount type (${motorMount}) is not compatible with Frame mount type (${frameMount}).`,
        relatedCategories: ['frame', 'motor'],
      });
    }
  }

  // 2. Battery & Controller Voltage Compatibility
  if (battery && controller) {
    const batteryVoltage = Number(battery.specs?.voltage);
    const controllerMaxVoltage = Number(controller.specs?.max_voltage);
    const controllerMinVoltage = Number(controller.specs?.min_voltage);

    if (!isNaN(batteryVoltage) && !isNaN(controllerMaxVoltage) && batteryVoltage > controllerMaxVoltage) {
      issues.push({
        severity: 'error',
        message: `Battery voltage (${batteryVoltage}v) exceeds Controller maximum voltage limit (${controllerMaxVoltage}v). Risk of severe damage.`,
        relatedCategories: ['battery', 'controller'],
      });
    }

    if (!isNaN(batteryVoltage) && !isNaN(controllerMinVoltage) && batteryVoltage < controllerMinVoltage) {
      issues.push({
        severity: 'error',
        message: `Battery voltage (${batteryVoltage}v) is below Controller minimum voltage requirement (${controllerMinVoltage}v).`,
        relatedCategories: ['battery', 'controller'],
      });
    }
  }

  // 3. Connectors Compatibility (Warning if possible mismatch)
  if (battery && controller) {
    const batteryConnector = battery.specs?.connector as string;
    const controllerConnectors = controller.specs?.connectors as string[];

    if (batteryConnector && controllerConnectors && Array.isArray(controllerConnectors)) {
      if (!controllerConnectors.includes(batteryConnector)) {
         issues.push({
            severity: 'warning',
            message: `Connector mismatch: Battery uses ${batteryConnector}, but Controller supports ${controllerConnectors.join(', ')}. An adapter may be required.`,
            relatedCategories: ['battery', 'controller'],
         });
      }
    }
  }

  return issues;
}
