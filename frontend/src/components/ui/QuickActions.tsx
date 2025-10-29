"use client";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Action {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

interface QuickActionsProps {
  title?: string;
  description?: string;
  actions: Action[];
  className?: string;
}

export function QuickActions({ 
  title = "Quick Actions", 
  description = "Common tasks to help you manage programs efficiently",
  actions,
  className 
}: QuickActionsProps) {
  return (
    <Card className={className}>
      <div className="p-5">
        <h3 className="font-bold mb-3 text-gray-900">{title}</h3>
        <p className="text-xs text-gray-600 mb-4">{description}</p>
        <div className="space-y-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                onClick={action.onClick}
                className="w-full justify-start"
                leftIcon={<Icon className="h-4 w-4" />}
              >
                {action.label}
              </Button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}


