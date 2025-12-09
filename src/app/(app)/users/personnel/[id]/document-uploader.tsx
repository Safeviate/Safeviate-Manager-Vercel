
'use client';

import { useState, type ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { format } from 'date-fns';

interface DocumentUploaderProps {
  trigger: ReactNode;
  defaultFileName?: string;
  onDocumentUploaded: (document: { name: string; url: string; uploadDate: string; expirationDate: string | null }) => void;
}

export function DocumentUploader({ trigger, defaultFileName = '', onDocumentUploaded }: DocumentUploaderProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState(defaultFileName);
  const [file, setFile] = useState<File | null>(null);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();

  useEffect(() => {
    // When the dialog opens, reset the state based on the props
    if (isOpen) {
      setFileName(defaultFileName);
      setFile(null);
      setExpirationDate(undefined);
    }
  }, [isOpen, defaultFileName]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        // Only set the file name from the file if a default name isn't provided
        if (!defaultFileName) {
            setFileName(selectedFile.name);
        }
    }
  };

  const handleUpload = () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No File Selected',
        description: 'Please select a file to upload.',
      });
      return;
    }
    if (!fileName.trim()) {
        toast({
          variant: 'destructive',
          title: 'File Name Required',
          description: 'Please provide a name for the document.',
        });
        return;
      }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const uploadDate = new Date().toISOString();

      onDocumentUploaded({
        name: fileName,
        url: dataUrl,
        uploadDate: uploadDate,
        expirationDate: expirationDate ? expirationDate.toISOString() : null,
      });

      toast({
        title: 'Document Uploaded',
        description: `"${fileName}" has been added to the user's profile.`,
      });
      
      setIsOpen(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl grid-rows-[auto,1fr,auto]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Select a file, give it a name, and optionally set an expiration date.
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-8 py-4 overflow-y-auto">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="file-name">Document Name</Label>
                    <Input
                    id="file-name"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="e.g., Passport Scan"
                    readOnly={!!defaultFileName} // Prevent editing if it's a required doc
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="file-upload">File</Label>
                    <Input id="file-upload" type="file" onChange={handleFileChange} />
                    {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
                </div>
                 {expirationDate && (
                    <div className='text-sm'>
                        Selected Expiration: <span className='font-semibold'>{format(expirationDate, "PPP")}</span>
                    </div>
                 )}
            </div>
            <div className="flex justify-center items-start">
                <CustomCalendar 
                    selectedDate={expirationDate}
                    onDateSelect={setExpirationDate}
                />
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpload}>Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
