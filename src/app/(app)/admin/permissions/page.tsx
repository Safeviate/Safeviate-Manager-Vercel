
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function PermissionsPage() {
  // We don't need permissions for settings, dashboard, or development tools
  const filteredMenuConfig = menuConfig.filter(
    (item) => !['/settings', '/dashboard', '/my-dashboard', '/development', '/admin'].includes(item.href)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Permissions</CardTitle>
        <CardDescription>
          Review permissions generated from the application menu structure. These
          can be assigned to roles.
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
                <div className="flex items-center space-x-2 rounded-md border p-4">
                  <Checkbox id={`${mainItem.href}-access`} />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor={`${mainItem.href}-access`}
                      className="cursor-pointer"
                    >
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
                        className="flex items-center space-x-2"
                      >
                        <Checkbox id={subItem.href} />
                        <div className="grid gap-1.5 leading-none">
                          <Label htmlFor={subItem.href} className="cursor-pointer">
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
