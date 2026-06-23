const normalizeUrl = (url) => url.trim().replace(/\/+$/, "");

const getAllowedOrigins = () => {
  const frontendUrls = process.env.FRONTEND_URL || "http://localhost:5173";

  return frontendUrls
    .split(",")
    .map((url) => normalizeUrl(url))
    .filter(Boolean);
};

const getPublicApiUrl = () => {
  const fallbackUrl = `http://localhost:${process.env.PORT || 5000}`;
  return normalizeUrl(process.env.PUBLIC_API_URL || fallbackUrl);
};

module.exports = { getAllowedOrigins, getPublicApiUrl, normalizeUrl };
