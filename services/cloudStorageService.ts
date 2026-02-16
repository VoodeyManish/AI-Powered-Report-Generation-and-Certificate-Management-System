
/**
 * Service to handle image uploads to a temporary public cloud.
 * This ensures that when we export to Excel, the links are viewable by anyone.
 */

export const uploadImageToCloud = async (base64Data: string, fileName: string): Promise<string> => {
    try {
        console.log('☁️ Uploading image to cloud:', fileName);
        
        // Convert base64 to Blob
        const response = await fetch(base64Data);
        const blob = await response.blob();

        const formData = new FormData();
        formData.append('file', blob, fileName);

        // Using tmpfiles.org API for free anonymous hosting
        const uploadResponse = await fetch('https://tmpfiles.org/api/v1/upload', {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            console.error('❌ Cloud upload failed with status:', uploadResponse.status);
            throw new Error(`Cloud upload failed: ${uploadResponse.status}`);
        }

        const result = await uploadResponse.json();
        
        // tmpfiles returns a URL like https://tmpfiles.org/123/name.png
        // We need the direct download link: https://tmpfiles.org/dl/123/name.png
        const rawUrl = result.data.url;
        const directUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');

        console.log('✅ Image uploaded successfully:', directUrl);
        return directUrl;
    } catch (error) {
        console.error('❌ Error uploading to cloud:', error);
        console.error('This might be a network issue or the service might be unavailable');
        // Fallback to a placeholder if upload fails (though we want this to work)
        return 'https://via.placeholder.com/800x600.png?text=Cloud+Upload+Failed';
    }
};
