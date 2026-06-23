const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
const streamifier = require("streamifier");
const { getPublicApiUrl } = require("./urls");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const sanitizeFolder = (folder) => folder.replace(/[^a-z0-9/_-]/gi, "-").replace(/\//g, path.sep);

const saveLocalUpload = async (fileBuffer, folder = "aashram-inventory") => {
  const uploadRoot = path.join(__dirname, "../../uploads");
  const targetFolder = path.join(uploadRoot, sanitizeFolder(folder));
  await fs.promises.mkdir(targetFolder, { recursive: true });

  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
  const filePath = path.join(targetFolder, fileName);
  await fs.promises.writeFile(filePath, fileBuffer);

  const publicBaseUrl = getPublicApiUrl();
  const relativePath = path.relative(uploadRoot, filePath).split(path.sep).join("/");

  return {
    url: `${publicBaseUrl}/uploads/${relativePath}`,
    publicId: `local/${relativePath}`
  };
};

const uploadToCloudinary = async (fileBuffer, folder = "aashram-inventory") => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return saveLocalUpload(fileBuffer, folder);
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

module.exports = { cloudinary, uploadToCloudinary };
