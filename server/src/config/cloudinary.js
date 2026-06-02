const cloudinary = require('cloudinary').v2
const multer = require('multer')
const path = require('path') // Built-in Node module

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }  // 5MB max
})

const uploadToCloudinary = (file, folder = 'agrovista/products') => {
    return new Promise((resolve, reject) => {

        const isVerificationFolder = folder.includes('verification')
        let options = { folder }

        if (isVerificationFolder) {
            
            const originalName = path.parse(file.originalname).name
            
            options = {
                ...options,
                resource_type: 'auto', // 1. Changing to 'auto' allows the browser to view it natively
                public_id: `${originalName}_${Date.now()}`, 
            }
        } else {
            options = {
                ...options,
                resource_type: 'image',
                transformation: [{ width: 800, height: 800, crop: 'limit' }]
            }
        }

        const stream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (error) {
                    console.error(' ❌ Cloudinary upload error:', error.http_code, error.message)
                    return reject(error)
                }
                resolve(result)
            }
        )
        // Send the buffer data here
        stream.end(file.buffer)
    })
}

const uploadFiles = async (files, folder = 'agrovista/products') => {
    const results = await Promise.all(
        // CRITICAL: Pass the whole 'file' object here, NOT just file.buffer
        files.map(file => uploadToCloudinary(file, folder)) 
    )
    return results.map(r => r.secure_url)
}

module.exports = { cloudinary, upload, uploadToCloudinary, uploadFiles }