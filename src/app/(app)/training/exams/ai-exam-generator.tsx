'use client';

import { useState, useCallback, ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ClipboardPaste, Wand2 } from 'lucide-react';
import { generateExam } from '@/ai/flows/generate-exam-flow';
import type { ExamTemplate } from '@/types/training';

interface AiExamGeneratorProps {
  onGenerated: (questions: ExamTemplate['questions']) => void;
}

export function AiExamGenerator({ onGenerated }: AiExamGeneratorProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [pastedImage, setPastedImage] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPastedImage(e.target?.result as string);
            toast({ title: 'Image Pasted', description: 'The image has been loaded.' });
          };
          reader.readAsDataURL(blob);
        }
        return;
      }
      if (items[i].type.startsWith('text/plain')) {
        event.preventDefault();
        items[i].getAsString((text) => {
          setPastedText(text);
          toast({ title: 'Text Pasted', description: 'The text has been loaded.' });
        });
        return;
      }
    }
  }, [toast]);

  const processAndSave = async (input: { text?: string; image?: string }) => {
    setIsProcessing(true);
    try {
      const { questions } = await generateExam({ document: input });

      if (!questions || questions.length === 0) {
        toast({ variant: 'destructive', title: 'No Questions Found', description: 'The AI could not identify any questions in the document.' });
        return;
      }

      onGenerated(questions);
      toast({ title: 'Exam Generated', description: `Successfully parsed ${questions.length} questions.` });
      setIsOpen(false);

    } catch (error: any) {
      console.error('Error processing document:', error);
      toast({ variant: 'destructive', title: 'Processing Failed', description: error.message || 'An unknown error occurred.' });
    } finally {
      setIsProcessing(false);
      setFile(null);
      setPastedText('');
      setPastedImage(null);
    }
  };

  const handleProcess = async () => {
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        await processAndSave({ text });
      };
      reader.readAsText(file);
    } else if (pastedText) {
      await processAndSave({ text: pastedText });
    } else if (pastedImage) {
      await processAndSave({ image: pastedImage });
    }
  };

  const canProcess = file || pastedText.trim() || pastedImage;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Wand2 className="h-4 w-4" /> Generate Questions with AI</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>AI Exam Generator</DialogTitle>
          <DialogDescription>
            Upload an existing exam or paste training material. The AI will extract or generate multiple-choice questions.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="text">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">Paste Text</TabsTrigger>
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="image">Paste Image</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="pt-4">
            <Textarea
              placeholder="Paste the source material or raw exam questions here..."
              className="h-48"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              onPaste={handlePaste}
            />
          </TabsContent>
          <TabsContent value="file" className="pt-4">
            <div className="space-y-2">
              <Label htmlFor="reg-file">Source File (.txt, etc.)</Label>
              <Input id="reg-file" type="file" onChange={handleFileChange} />
              {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
            </div>
          </TabsContent>
          <TabsContent value="image" className="pt-4">
            <div
              onPaste={handlePaste}
              className="h-48 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/10"
            >
              {pastedImage ? (
                <img src={pastedImage} alt="Pasted source" className="max-h-full max-w-full object-contain p-2" />
              ) : (
                <div className="text-center">
                  <ClipboardPaste className="mx-auto h-8 w-8" />
                  <p className="text-xs mt-2">Click here and paste an image (Ctrl+V)</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" disabled={isProcessing}>Cancel</Button></DialogClose>
          <Button onClick={handleProcess} disabled={isProcessing || !canProcess}>
            {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 'Generate Questions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
