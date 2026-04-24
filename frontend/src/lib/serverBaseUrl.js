const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\/$/, "");
};

export const getServerBaseUrl = () => {
  const configured = normalizeBaseUrl(
    import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL
  );

  if (configured) {
    return configured;
  }

  // During local development, default to local backend.
  if (typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
    return "http://localhost:5000";
  }

  // In deployed environments without explicit config, try same-origin.
  if (typeof window !== "undefined") {
    return normalizeBaseUrl(window.location.origin);
  }

  return "http://localhost:5000";
};
