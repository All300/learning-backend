import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        //console.log("file is uploaded on cloudinary", response.url)
        fs.unlinkSync(localFilePath)
        return response
    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null
    }
}

const deleteOnCloudinary = async(file_public_id) => {
    try {
        if(!file_public_id) {
            console.log("File not found")
            return null
        }

        const response = await cloudinary.uploader.destroy(file_public_id, {
            resource_type: "auto"
        })

        if(response.result === "ok") {
            console.log(`Successfully deleted file with public ID: ${file_public_id}`)
        }
        else {
            console.log(`Failed to delete file : ${response.result}`)
        }

        return response
    }
    catch(error) {
        console.log("error while deleting the file")
        throw error
    }
}

export {uploadOnCloudinary, deleteOnCloudinary}