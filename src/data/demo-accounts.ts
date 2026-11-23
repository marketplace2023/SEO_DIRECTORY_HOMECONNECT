import { registrationCounties, usCounties } from "./us-areas";

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
  ...registrationCounties.map((county) => {
    const name = usCounties.find(([id]) => id === county)![1];
    return {
      id: "account-demo-" + county,
      role: "contractor" as const,
      name: name + " Home Demo",
      email: county + "@example.test",
      label: {
        es: "Contratista de muestra · " + name,
        en: "Demo contractor · " + name,
      },
      registrationCounty: county,
      professionalId: "demo-" + county,
    };
  }),
] as const;
