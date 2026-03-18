import supabase from "@/utils/supabaseClient";

/**
 * Upload sample image to Supabase Storage
 * @param file - Image file to upload
 * @returns Public URL of uploaded image
 */
export async function uploadSampleImage(file: File): Promise<string> {
  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("File size exceeds 5MB limit");
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
  }

  // Generate unique filename
  const timestamp = Date.now();
  const fileExt = file.name.split(".").pop();
  const fileName = `sample_${timestamp}.${fileExt}`;
  const filePath = `samples/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("checklist-images") // Re-use the same bucket
    .upload(filePath, file, {
      cacheControl: "3600",
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
