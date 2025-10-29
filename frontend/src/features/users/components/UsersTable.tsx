/**
 * UsersTable Component
 * Displays users in a table format with actions
 */

import { Table, THead, TBody, TH, TD } from "@/components/Table";
import Badge from "@/components/Badge";
import { ActionButtons } from "@/components/ui/ActionButtons";
import { User } from "@/types";

interface UsersTableProps {
  users: User[];
  currentUserId?: string;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
}

export function UsersTable({ users, currentUserId, onEdit, onDelete }: UsersTableProps) {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "—";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Table>
      <THead>
        <tr>
          <TH>Name</TH>
          <TH>Email</TH>
          <TH>Role</TH>
          <TH>Status</TH>
          <TH>Created</TH>
          <TH>Actions</TH>
        </tr>
      </THead>
      <TBody>
        {users.map((u) => (
          <tr key={u.id}>
            <TD>
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                  {getInitials(u.name)}
                </div>
                <span className="font-semibold text-gray-900">{u.name}</span>
              </div>
            </TD>
            <TD><span className="text-gray-700">{u.email}</span></TD>
            <TD>
              <Badge
                variant={
                  u.role === "Admin"
                    ? "admin"
                    : u.role === "Healthcare Staff"
                    ? "staff"
                    : u.role === "Guest"
                    ? "guest"
                    : "neutral"
                }
              >
                {u.role}
              </Badge>
            </TD>
            <TD>
              <Badge variant="active">Active</Badge>
            </TD>
            <TD>
              <span className="text-gray-700">—</span>
            </TD>
            <TD>
              <ActionButtons
                onEdit={() => onEdit(u)}
                onDelete={() => onDelete(u.id)}
                canDelete={u.id !== currentUserId}
              />
            </TD>
          </tr>
        ))}
      </TBody>
    </Table>
  );
}

