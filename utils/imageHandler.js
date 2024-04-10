const express = require('express');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "DEV",
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter, });

const imageHandler = (req, res, next) => {
    const img = upload.single('avatar');

    img(req, res, function (err) {
        if(!req.file) {
            req.file = { path: 'https://cdn.iconscout.com/icon/free/png-256/avatar-380-456332.png' };
        }
        next();
    })
    
}

module.exports = imageHandler;

