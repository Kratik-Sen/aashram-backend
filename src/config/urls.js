const normalizeUrl = (url) => url.trim().replace(/\/+$/, "");

const LOCAL_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

const getAllowedOrigins = () => {
  const configuredOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",")
    : [];
  const defaultOrigins = process.env.NODE_ENV === "production" ? [] : LOCAL_DEV_ORIGINS;

  return [...configuredOrigins, ...defaultOrigins]
    .map((url) => normalizeUrl(url))
    .filter(Boolean)
    .filter((url, index, origins) => origins.indexOf(url) === index);
};

const getPublicApiUrl = () => {
  const fallbackUrl = `http://localhost:${process.env.PORT || 5000}`;
  return normalizeUrl(process.env.PUBLIC_API_URL || fallbackUrl);
};

module.exports = { getAllowedOrigins, getPublicApiUrl, normalizeUrl };
