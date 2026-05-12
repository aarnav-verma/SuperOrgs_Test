import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "Cooking App/**",
      "Cooking App v.2/**",
      "ENGS 106 Final/**",
      "March-Madness/**",
      "Notes App/**",
      "Shenanigans/**",
      "SuperOrgs/**",
      "panopto_to_latex/**"
    ]
  }
];

export default eslintConfig;
