const ATTRIBUTE_LABEL_ALIASES: Record<string, string> = {
  "Sorğu gücü": "Sorğu qüvvəsi",
  "Toz həcmi": "Toz tutumu",
  Filtr: "Filtr tipi",
};

function formatBatteryLabel(value: string): string {
  if (/mAh|mah/i.test(value)) {
    return "Batareya tutumu";
  }

  if (/saat|dəqiqə|dəq/i.test(value)) {
    return "Batareya müddəti";
  }

  return "Batareya";
}

export function formatProductAttributeLabel(key: string, value: string): string {
  if (key === "Batareya") {
    return formatBatteryLabel(value);
  }

  return ATTRIBUTE_LABEL_ALIASES[key] ?? key;
}

function formatVolumeValue(value: string): string {
  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)\s*l$/i);
  if (!match) {
    return value;
  }

  const amount = match[1].replace(".", ",");
  return `${amount} l`;
}

function formatDurationValue(value: string): string {
  const minuteMatch = value.trim().match(/^(\d+)\s*dəq\.?$/i);
  if (minuteMatch) {
    return `${minuteMatch[1]} dəqiqə`;
  }

  return value;
}

export function formatProductAttributeValue(key: string, value: string): string {
  if (key === "Toz həcmi" || key === "Toz tutumu") {
    return formatVolumeValue(value);
  }

  if (key === "Batareya" || key === "Batareya müddəti") {
    return formatDurationValue(value);
  }

  return value;
}
