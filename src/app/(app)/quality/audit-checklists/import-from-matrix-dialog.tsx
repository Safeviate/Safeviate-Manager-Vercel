'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Library } from 'lucide-react';
import type { ComplianceRequirement, ChecklistSection } from '@/types/quality';
import { v4 as uuidv4 } from 'uuid';

interface ImportFromMatrixDialogProps {
    complianceItems: ComplianceRequirement[];
    onImport: (sections: ChecklistSection[]) => void;
}

export function ImportFromMatrixDialog({ complianceItems, onImport }: ImportFromMatrixDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

    const naturalSort = (a: string, b: string) => {
        const re = /(\d+)/g;
        const aParts = a.split(re);
        const bParts = b.split(re);
        const len = Math.min(aParts.length, bParts.length);
        for (let i = 0; i < len; i++) {
            const aPart = aParts[i];
            const bPart = bParts[i];
            if (i % 2 === 1) {
                const aNum = parseInt(aPart, 10);
                const bNum = parseInt(bPart, 10);
                if (aNum !== bNum) return aNum - bNum;
            } else {
                if (aPart !== bPart) return aPart.localeCompare(bPart);
            }
        }
        return a.length - b.length;
    };
    
    const sortedComplianceItems = useMemo(() => {
        if (!complianceItems) return [];
        return [...complianceItems].sort((a, b) => naturalSort(a.regulationCode, b.regulationCode));
    }, [complianceItems]);

    const groupedComplianceItems = useMemo(() => {
        return sortedComplianceItems.reduce((acc, item) => {
            const parentCode = item.parentRegulationCode;
            if (parentCode) {
                if (!acc[parentCode]) acc[parentCode] = [];
                acc[parentCode].push(item);
            }
            return acc;
        }, {} as Record<string, ComplianceRequirement[]>);
    }, [sortedComplianceItems]);

    const topLevelItems = useMemo(() => sortedComplianceItems.filter(item => !item.parentRegulationCode), [sortedComplianceItems]);

    const handleParentToggle = (parentCode: string, checked: boolean) => {
        const childIds = (groupedComplianceItems[parentCode] || []).map(child => child.id);
        const newSelected = { ...selectedItems };
        newSelected[parentCode] = checked;
        childIds.forEach(id => {
            newSelected[id] = checked;
        });
        setSelectedItems(newSelected);
    };
    
    const handleChildToggle = (parentId: string, childId: string, checked: boolean) => {
        const newSelected = { ...selectedItems };
        newSelected[childId] = checked;

        const childIds = (groupedComplianceItems[parentId] || []).map(child => child.id);
        const allChildrenSelected = childIds.every(id => newSelected[id]);
        newSelected[parentId] = allChildrenSelected;

        setSelectedItems(newSelected);
    };
    
    const handleImport = () => {
        const importedSections: ChecklistSection[] = [];
        
        topLevelItems.forEach(parent => {
            const children = groupedComplianceItems[parent.regulationCode] || [];
            const selectedChildren = children.filter(child => selectedItems[child.id]);

            if (selectedChildren.length > 0) {
                importedSections.push({
                    id: uuidv4(),
                    title: `${parent.regulationCode} - ${parent.regulationStatement}`,
                    items: selectedChildren.map(child => ({
                        id: uuidv4(),
                        text: child.regulationStatement,
                        regulationReference: child.regulationCode,
                        type: 'Checkbox'
                    }))
                });
            }
        });
        
        onImport(importedSections);
        setIsOpen(false);
        setSelectedItems({});
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><Library className="mr-2 h-4 w-4" /> Import from Matrix</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Import from Coherence Matrix</DialogTitle>
                    <DialogDescription>
                        Select the regulations you want to turn into checklist items.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] p-1">
                    <div className="space-y-2 pr-4">
                        {topLevelItems.map(parentItem => {
                            const children = groupedComplianceItems[parentItem.regulationCode] || [];
                            const isParentSelected = !!selectedItems[parentItem.regulationCode];
                            const areSomeChildrenSelected = children.some(c => selectedItems[c.id]);
                            const indeterminate = areSomeChildrenSelected && !isParentSelected;

                            return (
                                <Collapsible key={parentItem.id} className="border rounded-lg">
                                    <div className="flex items-center p-2 bg-muted/20">
                                        <Checkbox
                                            id={parentItem.id}
                                            checked={isParentSelected}
                                            onCheckedChange={(checked) => handleParentToggle(parentItem.regulationCode, !!checked)}
                                            aria-label={`Select all under ${parentItem.regulationCode}`}
                                            className="mx-2"
                                            data-state={indeterminate ? 'indeterminate' : (isParentSelected ? 'checked' : 'unchecked')}
                                        />
                                        <CollapsibleTrigger className="flex flex-1 items-center text-left text-sm font-semibold">
                                            <span>{parentItem.regulationCode} - {parentItem.regulationStatement}</span>
                                            <ChevronDown className="h-4 w-4 ml-auto shrink-0 transition-transform duration-200 group-data-[state=open]:-rotate-180" />
                                        </CollapsibleTrigger>
                                    </div>
                                    <CollapsibleContent className="p-2 pl-6">
                                        {children.map(child => (
                                            <div key={child.id} className="flex items-center gap-2 py-1">
                                                <Checkbox
                                                    id={child.id}
                                                    checked={!!selectedItems[child.id]}
                                                    onCheckedChange={(checked) => handleChildToggle(parentItem.regulationCode, child.id, !!checked)}
                                                />
                                                <label htmlFor={child.id} className="text-sm cursor-pointer">
                                                    {child.regulationStatement}
                                                </label>
                                            </div>
                                        ))}
                                    </CollapsibleContent>
                                </Collapsible>
                            )
                        })}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleImport}>Import Selected</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
