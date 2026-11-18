export const demoAccounts = [
  {
    id: "demo-owner",
    role: "owner",
    name: "Carolina Mendoza",
    email: "carolina@example.test",
    label: { es: "Consumidora de prueba", en: "Demo consumer" },
  },
  {
    id: "demo-contractor",
    role: "contractor",
    name: "Construcciones Ruiz",
    email: "ruiz@example.test",
    label: { es: "Contratista de prueba", en: "Demo contractor" },
  },
  {
    id: "demo-admin",
    role: "admin",
    name: "Lucía Ramos",
    email: "admin@example.test",
    label: { es: "Administradora de prueba", en: "Demo administrator" },
  },
] as const;
