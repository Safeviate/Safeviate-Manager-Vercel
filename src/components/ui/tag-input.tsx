
'use client';

import React, { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type InputProps = React.ComponentProps<typeof Input>;

interface TagInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  value: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ value: tags, onChange, className, placeholder, ...props }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const addTag = (tagToAdd: string) => {
    const newTag = tagToAdd.trim();
    if (newTag && !tags.includes(newTag)) {
      onChange([...tags, newTag]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '') {
      e.preventDefault();
      const lastTag = tags[tags.length - 1];
      if (lastTag) {
        removeTag(lastTag);
      }
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-md border border-input p-2", className)}>
        {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-4 w-4 rounded-full"
                    onClick={() => removeTag(tag)}
                >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {tag}</span>
                </Button>
            </Badge>
        ))}
        <Input
            {...props}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-auto flex-1 border-none bg-transparent p-0 shadow-none outline-none ring-0 focus-visible:ring-0"
        />
    </div>
  );
}
