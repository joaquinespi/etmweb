// ⚠️ AUTO-GENERADO por scripts/generate-tina-options.mjs
// NO EDITAR MANUALMENTE
// Ejecutar: npm run generate:options

export interface Option {
  value: string;
  label: string;
}

export const brandOptions: Option[] = [
  {
    "value": "apple",
    "label": "Apple"
  },
  {
    "value": "claro",
    "label": "Claro"
  },
  {
    "value": "honor",
    "label": "Honor"
  },
  {
    "value": "huawei",
    "label": "Huawei"
  },
  {
    "value": "logic",
    "label": "Logic"
  },
  {
    "value": "marca-test",
    "label": "Marca Test"
  },
  {
    "value": "motorola",
    "label": "Motorola"
  },
  {
    "value": "oppo",
    "label": "Oppo"
  },
  {
    "value": "poco",
    "label": "Poco"
  },
  {
    "value": "redmi",
    "label": "Redmi"
  },
  {
    "value": "samsung",
    "label": "Samsung"
  },
  {
    "value": "vivo",
    "label": "Vivo"
  },
  {
    "value": "xiaomi",
    "label": "Xiaomi"
  },
  {
    "value": "zte",
    "label": "Zte"
  }
];

export const categoryOptions: Option[] = [
  {
    "value": "accesorios",
    "label": "Accesorios"
  },
  {
    "value": "equipo-celular",
    "label": "Equipo Celular"
  },
  {
    "value": "router-ifi",
    "label": "Router IFI"
  },
  {
    "value": "router-olo",
    "label": "Router OLO"
  },
  {
    "value": "tfi",
    "label": "TFI"
  }
];

export const locationOptions: Option[] = [
  {
    "value": "pdv-chosica",
    "label": "Pdv Chosica"
  },
  {
    "value": "pdv-cieneguilla",
    "label": "Pdv Cieneguilla"
  },
  {
    "value": "pdv-lurin",
    "label": "Pdv Lurin"
  }
];

export const getBrandLabel = (
  value: string,
): string =>
  brandOptions.find(
    (brand) => brand.value === value,
  )?.label || value;

export const getCategoryLabel = (
  value: string,
): string =>
  categoryOptions.find(
    (category) => category.value === value,
  )?.label || value;

export const getLocationLabel = (
  value: string,
): string =>
  locationOptions.find(
    (location) => location.value === value,
  )?.label || value;
