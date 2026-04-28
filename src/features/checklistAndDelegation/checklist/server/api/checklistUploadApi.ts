import supabase from "@/utils/supabaseClient";
import { compressImage } from "@/utils/imageCompression";

/**
 * Upload image to Supabase Storage
 * @param file - Image file to upload
 * @param taskId - Task ID for unique naming
 * @returns Public URL of uploaded image
 */
export async function uploadChecklistImage(
  file: File,
  taskId: number,
): Promise<string> {
  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
  }

  // Compress image
  let uploadData: File = file;
  try {
    uploadData = await compressImage(file, 1024, 1024, 0.7);
  } catch (error) {
    console.warn("Compression failed, uploading original:", error);
  }

  // Generate unique filename
  const timestamp = Date.now();
  const fileExt = file.name.split(".").pop();
  const fileName = `${taskId}_${timestamp}.${fileExt}`;
  const filePath = `checklist/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("checklist-images")
    .upload(filePath, uploadData, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("checklist-images").getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Delete image from Supabase Storage
 * @param imageUrl - Public URL of the image to delete
 */
export async function deleteChecklistImage(imageUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split("/");
    const filePath = pathParts.slice(-2).join("/"); // Get 'checklist/filename.ext'

    const { error } = await supabase.storage
      .from("checklist-images")
      .remove([filePath]);

    if (error) {
      console.error("Delete error:", error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  } catch (error) {
    console.error("Error parsing image URL:", error);
    throw new Error("Invalid image URL");
  }
}
