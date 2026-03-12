'use client';

import { useState, type ReactNode, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Camera } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type UploadMode = 'file' | 'camera';

interface DocumentUploaderProps {
  trigger: (open: (mode?: UploadMode) => void) => ReactNode;
  defaultFileName?: string;
  onDocumentUploaded: (document: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => void;
  restrictedMode?: UploadMode;
}

export function DocumentUploader({ trigger, defaultFileName = '', onDocumentUploaded, restrictedMode }: DocumentUploaderProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>(restrictedMode || 'file');

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // Form state
  const [fileName, setFileName] = useState(defaultFileName);
  const [file, setFile] = useState<File | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const cleanupCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const resetForm = useCallback(() => {
    setFileName(defaultFileName);
    setFile(null);
    setCapturedImage(null);
    setHasCameraPermission(null);
    setUploadMode(restrictedMode || 'file');
  }, [defaultFileName, restrictedMode]);

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      cleanupCamera();
      resetForm();
    } else {
      setFileName(defaultFileName);
    }
  };

  const openDialog = (mode: UploadMode = 'file') => {
    setUploadMode(restrictedMode || mode);
    setIsOpen(true);
  };
  
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen && uploadMode === 'camera' && !capturedImage) {
      const getCameraPermission = async () => {
        try {
          const constraints = {
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings.',
          });
        }
      };
      getCameraPermission();
    }
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, uploadMode, capturedImage, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        if (!defaultFileName) {
            setFileName(selectedFile.name);
        }
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(dataUrl);
            cleanupCamera();
        }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleUpload = () => {
    if (!fileName.trim()) {
        toast({
          variant: 'destructive',
          title: 'File Name Required',
          description: 'Please provide a name for the document.',
        });
        return;
    }

    if (uploadMode === 'file') {
        if (!file) {
            toast({ variant: 'destructive', title: 'No File Selected', description: 'Please select a file to upload.' });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            finishUpload(reader.result as string);
        };
        reader.readAsDataURL(file);
    } else if (uploadMode === 'camera') {
        if (!capturedImage) {
            toast({ variant: 'destructive', title: 'No Photo Taken', description: 'Please take a photo to upload.' });
            return;
        }
        finishUpload(capturedImage);
    }
  };
  
  const finishUpload = (dataUrl: string) => {
    const uploadDate = new Date().toISOString();
    onDocumentUploaded({
        name: fileName,
        url: dataUrl,
        uploadDate: uploadDate,
        expirationDate: null,
    });

    toast({
        title: 'Document Uploaded',
        description: `"${fileName}" has been prepared for saving.`,
    });
    
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger(openDialog)}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            {restrictedMode === 'camera' 
              ? 'Take a photo of the document using your camera.' 
              : restrictedMode === 'file' 
              ? 'Select a file from your device to upload.' 
              : 'Upload a file or take a photo of the document.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
            <div className="space-y-2">
                <Label htmlFor="file-name">Document Name</Label>
                <Input
                    id="file-name"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="e.g., C of A, Insurance"
                />
            </div>
            <Tabs value={uploadMode} onValueChange={(value) => !restrictedMode && setUploadMode(value as UploadMode)} className='w-full'>
                {!restrictedMode && (
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="file">Upload File</TabsTrigger>
                        <TabsTrigger value="camera">Take Photo</TabsTrigger>
                    </TabsList>
                )}
                <TabsContent value="file">
                    <div className="space-y-2 pt-4">
                        <Label htmlFor="file-upload">File</Label>
                        <Input id="file-upload" type="file" onChange={handleFileChange} />
                        {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
                    </div>
                </TabsContent>
                <TabsContent value="camera">
                     <div className="space-y-4 pt-4">
                        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
                           {capturedImage ? (
                               <img src={capturedImage} alt="Captured document" className="h-full w-full object-contain" />
                           ) : (
                               <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
                           )}
                           {hasCameraPermission === false && (
                               <div className='absolute inset-0 flex items-center justify-center p-4'>
                                    <Alert variant="destructive">
                                        <AlertTitle>Camera Access Required</AlertTitle>
                                        <AlertDescription>
                                            Please allow camera access to use this feature.
                                        </AlertDescription>
                                    </Alert>
                               </div>
                           )}
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                        <div className='flex gap-2'>
                            {capturedImage ? (
                                <Button type="button" variant="outline" onClick={handleRetake}>Retake Photo</Button>
                            ) : (
                                <Button type="button" onClick={handleCapture} disabled={hasCameraPermission !== true}>
                                    <Camera className='mr-2' />
                                    Capture
                                </Button>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleUpload}>Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
