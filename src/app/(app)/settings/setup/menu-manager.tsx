'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { menuConfig, settingsMenuItem } from '@/lib/menu-config';
import type { MenuItem, SubMenuItem } from '@/lib/menu-config';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const allMenuItems = [...menuConfig, settingsMenuItem];

export function MenuManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu Configuration</CardTitle>
        <CardDescription>Manage the main navigation menus and their sub-menus.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Main Menu
            </Button>
          </div>
          <Separator />
          <div className="space-y-6">
            {allMenuItems.map((item: MenuItem) => (
              <div key={item.href} className="p-4 border rounded-lg space-y-4 bg-muted/20">
                {/* Main Menu Item */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <item.icon className="h-6 w-6 text-muted-foreground" />
                    <div className="font-semibold">{item.label}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Sub Menu Items */}
                {item.subItems && item.subItems.length > 0 && (
                  <div className="pl-10 space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="text-sm font-medium text-muted-foreground">Sub-menus</h4>
                        <Button variant="outline" size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Sub-menu
                        </Button>
                    </div>
                    {item.subItems.map((subItem: SubMenuItem) => (
                      <div key={subItem.href} className="flex items-center justify-between p-3 border rounded-md bg-background">
                        <div>
                          <div className="font-medium">{subItem.label}</div>
                          <p className="text-sm text-muted-foreground">{subItem.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
