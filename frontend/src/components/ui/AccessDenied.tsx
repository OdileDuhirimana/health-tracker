import { Card } from "./Card";
import { LockClosedIcon } from "@heroicons/react/24/outline";

export function AccessDenied({ 
  title = "Access Denied", 
  message = "You do not have permission to access this resource." 
}: { 
  title?: string; 
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card padding="lg" className="text-center max-w-md">
        <div className="mb-4 flex justify-center">
          <LockClosedIcon className="h-16 w-16 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
      </Card>
    </div>
  );
}

