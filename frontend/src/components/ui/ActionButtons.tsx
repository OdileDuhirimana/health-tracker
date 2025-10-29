"use client";

import { PencilIcon, TrashIcon, EyeIcon } from "@heroicons/react/24/outline";

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  viewLabel?: string;
}

export function ActionButtons({
  onView,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  viewLabel = "View",
}: ActionButtonsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {onView && (
        <button
          onClick={onView}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 transition-all shadow-sm font-semibold"
          title={viewLabel}
        >
          {viewLabel}
        </button>
      )}
      {onEdit && canEdit && (
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-all"
          title="Edit"
          aria-label="Edit"
        >
          <PencilIcon className="h-4 w-4 text-gray-600" />
        </button>
      )}
      {onDelete && canDelete && (
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg hover:bg-red-50 active:bg-red-100 transition-all"
          title="Delete"
          aria-label="Delete"
        >
          <TrashIcon className="h-4 w-4 text-red-600" />
        </button>
      )}
    </div>
  );
}

