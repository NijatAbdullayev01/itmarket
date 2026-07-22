import type { ProductRequiredSpecEntry } from '../catalog/product-required-specs';

function normalizeSpecLabel(label: string) {
  return label
    .trim()
    .toLocaleLowerCase('az')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ');
}

function isTemporaryMemorySpecLabel(label: string) {
  const normalized = normalizeSpecLabel(label);
  if (normalized === '') {
    return false;
  }
  return (
    normalized.includes('ram') ||
    (normalized.includes('operativ') && normalized.includes('yadd')) ||
    normalized.includes('operativ memory') ||
    normalized.includes('operational memory') ||
    (normalized.includes('müvəqqəti') && normalized.includes('yadd')) ||
    (normalized.includes('muveqqeti') && normalized.includes('yadd'))
  );
}

function isPermanentStorageLabel(label: string) {
  if (isTemporaryMemorySpecLabel(label)) {
    return false;
  }
  const normalized = normalizeSpecLabel(label);
  return (
    normalized.includes('daimi yadd') ||
    normalized.includes('ssd') ||
    normalized.includes('storage') ||
    normalized.includes('permanent storage') ||
    normalized.includes('daxili yadd') ||
    (normalized.includes('yadd') &&
      !normalized.includes('operativ') &&
      !normalized.includes('müvəqqəti') &&
      !normalized.includes('muveqqeti'))
  );
}

const COLOR_SPEC_LABELS = new Set(
  ['rəng', 'reng', 'color', 'renk'].map((entry) =>
    entry.toLocaleLowerCase('az'),
  ),
);

function isColorSpecLabel(label: string) {
  const normalized = label.trim().toLocaleLowerCase('az');
  return normalized !== '' && COLOR_SPEC_LABELS.has(normalized);
}

const METER_SPEC_LABELS = new Set(
  ['metr', 'meter', 'metre', 'uzunluq', 'length'].map((entry) =>
    entry.toLocaleLowerCase('az'),
  ),
);

function isMeterSpecLabel(label: string) {
  const normalized = normalizeSpecLabel(label);
  return normalized !== '' && METER_SPEC_LABELS.has(normalized);
}

function isPortCountSpecLabel(label: string) {
  const normalized = normalizeSpecLabel(label);
  if (normalized === '') {
    return false;
  }
  return (
    normalized === 'port' ||
    normalized.includes('port say') ||
    normalized.includes('port count') ||
    normalized.includes('ports')
  );
}

function isPoeCountSpecLabel(label: string) {
  const normalized = normalizeSpecLabel(label);
  return normalized !== '' && normalized.includes('poe');
}

function isTransferSpeedSpecLabel(label: string) {
  const normalized = normalizeSpecLabel(label);
  if (normalized === '') {
    return false;
  }
  return (
    normalized === 'sürət' ||
    normalized === 'surət' ||
    normalized.includes('speed') ||
    normalized.includes('bandwidth') ||
    (normalized.includes('ötürmə') && normalized.includes('sür')) ||
    (normalized.includes('oturme') && normalized.includes('sur'))
  );
}

const COLOR_HEX_SPEC_LABELS = new Set(
  ['rəng kodu', 'color hex', 'colorhex', 'hex'].map((entry) =>
    entry.toLocaleLowerCase('az'),
  ),
);

function isColorHexSpecLabel(label: string) {
  const normalized = label.trim().toLocaleLowerCase('az');
  return normalized !== '' && COLOR_HEX_SPEC_LABELS.has(normalized);
}

export function buildIntakeVariantAttributesFromRequiredSpecs(
  entries: ProductRequiredSpecEntry[],
): Record<string, string> {
  const attributes: Record<string, string> = {};
  let permanentStorage = '';
  let operationalMemory = '';
  let color = '';
  let colorHex = '';
  let meter = '';
  let portCount = '';
  let poeCount = '';
  let transferSpeed = '';

  for (const entry of entries) {
    const label = entry.label.trim();
    const value = entry.value.trim();
    if (label === '' || value === '') {
      continue;
    }
    if (isColorHexSpecLabel(label)) {
      colorHex = value;
      continue;
    }
    if (isTemporaryMemorySpecLabel(label)) {
      operationalMemory = value;
      continue;
    }
    if (isPermanentStorageLabel(label)) {
      permanentStorage = value;
      continue;
    }
    if (isColorSpecLabel(label)) {
      color = value;
      continue;
    }
    if (isMeterSpecLabel(label)) {
      meter = value;
      continue;
    }
    if (isPortCountSpecLabel(label)) {
      portCount = value;
      continue;
    }
    if (isPoeCountSpecLabel(label)) {
      poeCount = value;
      continue;
    }
    if (isTransferSpeedSpecLabel(label)) {
      transferSpeed = value;
    }
  }

  if (permanentStorage !== '') {
    attributes.Yaddaş = permanentStorage;
  }
  if (operationalMemory !== '') {
    attributes.RAM = operationalMemory;
  }
  if (color !== '') {
    attributes.Rəng = color;
  }
  if (color !== '' && colorHex !== '') {
    attributes['Rəng kodu'] = colorHex;
  }
  if (meter !== '') {
    attributes.Metr = meter;
  }
  if (portCount !== '') {
    attributes['Port sayı'] = portCount;
  }
  if (poeCount !== '') {
    attributes['PoE sayı'] = poeCount;
  }
  if (transferSpeed !== '') {
    attributes['Ötürmə sürəti'] = transferSpeed;
  }

  return attributes;
}

export function buildIntakeVariantNameFromRequiredSpecs(
  entries: ProductRequiredSpecEntry[],
  fallbackModelName: string,
): string {
  let permanentStorage = '';
  let operationalMemory = '';
  let meter = '';
  let portCount = '';
  let poeCount = '';
  let transferSpeed = '';

  for (const entry of entries) {
    const label = entry.label.trim();
    const value = entry.value.trim();
    if (label === '' || value === '') {
      continue;
    }
    if (isTemporaryMemorySpecLabel(label)) {
      operationalMemory = value;
    } else if (isPermanentStorageLabel(label)) {
      permanentStorage = value;
    } else if (isMeterSpecLabel(label)) {
      meter = value;
    } else if (isPortCountSpecLabel(label)) {
      portCount = value;
    } else if (isPoeCountSpecLabel(label)) {
      poeCount = value;
    } else if (isTransferSpeedSpecLabel(label)) {
      transferSpeed = value;
    }
  }

  const parts = [
    permanentStorage,
    operationalMemory,
    meter,
    portCount !== '' ? `${portCount} port` : '',
    poeCount !== '' ? `${poeCount} PoE` : '',
    transferSpeed,
  ].filter(
    (part) => part !== '',
  );
  if (parts.length === 0) {
    return fallbackModelName.trim();
  }
  return parts.join(' / ');
}
