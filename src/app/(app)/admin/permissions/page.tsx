
import { menuConfig } from '@/lib/menu-config';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

export default function PermissionsPage() {
  // We don't need permissions for settings, dashboard, or development tools
  const filteredMenuConfig = menuConfig.filter(
    (item) => !['/settings', '/dashboard', '/my-dashboard', '/development'].includes(item.href)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Permissions</CardTitle>
        <CardDescription>
          Review permissions generated from the application menu structure. These
          are for reference and can be assigned to roles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {filteredMenuConfig.map((mainItem) => (
            <AccordionItem value={mainItem.href} key={mainItem.href}>
              <AccordionTrigger className="text-lg font-medium">
                {mainItem.label}
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="flex items-center space-x-3 rounded-md border p-4">
                  <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="grid gap-1.5 leading-none">
                    <Label>
                      Access to {mainItem.label} Section
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allows users to view the main &quot;{mainItem.label}&quot; page and see its
                      sub-menu items in the sidebar.
                    </p>
                  </div>
                </div>

                {mainItem.subItems && mainItem.subItems.length > 0 && (
                  <div className="ml-6 space-y-4 border-l pl-6">
                    <h4 className="font-medium text-muted-foreground">
                      Sub-Permissions
                    </h4>
                    {mainItem.subItems.map((subItem) => (
                      <div
                        key={subItem.href}
                        className="flex items-center space-x-3"
                      >
                        <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                            <Check className="h-4 w-4" />
                        </div>
                        <div className="grid gap-1.5 leading-none">
                          <Label>
                            {subItem.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {subItem.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
