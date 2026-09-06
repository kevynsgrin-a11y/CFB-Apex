import { providerHealth } from "../lib/cfb-dataset.ts";

const live = providerHealth.filter((provider) => provider.mode === "production");
console.log("Data sync: no production providers are configured.");
console.log(
  live.map(({ id, status }) => ({ id, status })),
);
