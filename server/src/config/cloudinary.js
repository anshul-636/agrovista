const cloudinary = require('cloudinary').v2
const multer = require('multer')

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

console.log('  ☁️   Cloudinary cloud_name:', process.env.CLOUDINARY_CLOUD_NAME || '❌ MISSING')
console.log('  ☁️   Cloudinary api_key   :', process.env.CLOUDINARY_API_KEY ? 'Present ✅' : '❌ MISSING')
console.log('  ☁️   Cloudinary api_secret:', process.env.CLOUDINARY_API_SECRET ? 'Present ✅' : '❌ MISSING')

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }  // 5MB max
})

const uploadToCloudinary = (buffer, folder = 'agrovista/products') => {
    return new Promise((resolve, reject) => {

        // ── Verification documents (PDF + images) ───────────────────────────
        // ── Product images ───────────────────────────────────────────────────
        // Use resource_type: 'image' with resize transformation (always JPEG/PNG).
        // ─────────────────────────────────────────────────────────────────────
        const isVerificationFolder = folder.includes('verification')

        const options = isVerificationFolder
            ? {
                folder,
                resource_type: 'raw',   // store as-is, no conversion
                use_filename: true,
                unique_filename: true,
            }
            : {
                folder,
                resource_type: 'image',
                transformation: [{ width: 800, height: 800, crop: 'limit' }]
            }

        const stream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (error) {
                    console.error('  ❌  Cloudinary upload error:', error.http_code, error.message)
                    return reject(error)
                }
                resolve(result)
            }
        )
        stream.end(buffer)
    })
}

const uploadFiles = async (files, folder = 'agrovista/products') => {
    const results = await Promise.all(
        files.map(file => uploadToCloudinary(file.buffer, folder))
    )
    return results.map(r => r.secure_url)
}

module.exports = { cloudinary, upload, uploadToCloudinary, uploadFiles }