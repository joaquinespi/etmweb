// ⚠️ AUTO-GENERADO por scripts/generate-tina-options.mjs
// NO EDITAR MANUALMENTE
// Ejecutar: npm run generate:options

export interface Option {
  value: string;
  label: string;
}

export const brandOptions: Option[] = [
  {
    "value": "alcatel",
    "label": "Alcatel"
  },
  {
    "value": "apple",
    "label": "Apple"
  },
  {
    "value": "azumi",
    "label": "Azumi"
  },
  {
    "value": "claro",
    "label": "Claro"
  },
  {
    "value": "coolpad",
    "label": "Coolpad"
  },
  {
    "value": "corn",
    "label": "Corn"
  },
  {
    "value": "hello",
    "label": "Hello"
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
    "value": "ifitec-3000",
    "label": "Ifitec 3000"
  },
  {
    "value": "ipro",
    "label": "Ipro"
  },
  {
    "value": "jbl",
    "label": "Jbl"
  },
  {
    "value": "lg",
    "label": "Lg"
  },
  {
    "value": "logic",
    "label": "Logic"
  },
  {
    "value": "motorola",
    "label": "Motorola"
  },
  {
    "value": "nokia",
    "label": "Nokia"
  },
  {
    "value": "oltech",
    "label": "Oltech"
  },
  {
    "value": "oppo",
    "label": "Oppo"
  },
  {
    "value": "realme",
    "label": "Realme"
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
    "value": "tcl",
    "label": "Tcl"
  },
  {
    "value": "tech-tfi0200",
    "label": "Tech Tfi0200"
  },
  {
    "value": "tmcell",
    "label": "Tmcell"
  },
  {
    "value": "unonu",
    "label": "Unonu"
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

// Helper para obtener label por value
export const getBrandLabel = (value: string): string =>
  brandOptions.find(b => b.value === value)?.label || value;

export const getCategoryLabel = (value: string): string =>
  categoryOptions.find(c => c.value === value)?.label || value;

export const getLocationLabel = (value: string): string =>
  locationOptions.find(l => l.value === value)?.label || value;
