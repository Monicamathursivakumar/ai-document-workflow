import { getServerBaseUrl as getServerBaseUrlFromConfig } from "./serverBaseUrl";

export const KMRL_DEPARTMENT_NAMES = [
  "Global Headquarters",
  "Metro Operations",
  "Rolling Stock (Maintenance)",
  "Signaling & Telecom (S&T)",
  "Civil Engineering",
  "Electrical (Traction)",
  "Human Resources (HR)",
  "Finance & Accounts",
  "IT & Systems",
  "Safety & Security",
  "Customer Service",
];

export const DEFAULT_DEPARTMENTS = KMRL_DEPARTMENT_NAMES.map((name, index) => ({
  id: index + 1,
  name,
}));

export const getServerBaseUrl = () => getServerBaseUrlFromConfig();
