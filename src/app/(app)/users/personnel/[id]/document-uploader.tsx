'use client';

import { useState, type ReactNode } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DocumentUploaderProps {
  trigger: ReactNode;
  defaultFileName?: string;
  onDocumentUploaded: (document: { name: string; url: string; uploadDate: string; expirationDate?: string }) => void;
}

export function DocumentUploader({ trigger, defaultFileName = '', onDocumentUploaded }: DocumentUploaderProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState(defaultFileName);
  const [file, setFile] = useState<File | null>(null);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        if (!defaultFileName) {
            // Set file name from the selected file if no default is provided
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

    // --- In a real app, this is where you would upload to Firebase Storage ---
    console.log(`Simulating upload for file: ${file.name} as "${fileName}"`);
    const simulatedDownloadURL = `https://example.com/docs/${Date.now()}-${file.name}`;
    const uploadDate = new Date().toISOString();

    onDocumentUploaded({
      name: fileName,
      url: simulatedDownloadURL,
      uploadDate: uploadDate,
      expirationDate: expirationDate?.toISOString(),
    });

    toast({
      title: 'Document "Uploaded"',
      description: `"${fileName}" has been added to the user's profile. (Simulated)`,
    });
    
    resetAndClose();
  };

  const resetAndClose = () => {
    setFile(null);
    setFileName(defaultFileName);
    setExpirationDate(undefined);
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            resetAndClose();
        }
        setIsOpen(open);
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Select a file and give it a name. This will be added to the user's records.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file-name">Document Name</Label>
            <Input
              id="file-name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g., Passport Scan"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file-upload">File</Label>
            <Input id="file-upload" type="file" onChange={handleFileChange} />
             {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
          </div>
          <div className="space-y-2">
              <Label>Expiration Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expirationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expirationDate ? format(expirationDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expirationDate}
                    onSelect={setExpirationDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
