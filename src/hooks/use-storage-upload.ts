import { useState, useCallback } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useFirebase } from '@/firebase';

export function useStorageUpload() {
  const { storage } = useFirebase();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(async (
    file: File, 
    path: string, 
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    if (!storage) throw new Error('Storage not initialized');

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          if (onProgress) onProgress(progress);
        },
        (err) => {
          setError(err);
          setIsUploading(false);
          reject(err);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setIsUploading(false);
            resolve(downloadURL);
          } catch (err: any) {
            setError(err);
            setIsUploading(false);
            reject(err);
          }
        }
      );
    });
  }, [storage]);

  return { uploadFile, isUploading, uploadProgress, error };
}
