"use client";

/**
 * Users Page
 * Main page for managing system users
 * Refactored for modularity and maintainability
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, SearchBar } from "@/components/ui/PageHeader";
import { UserForm } from "@/components/forms/UserForm";
import { Pagination } from "@/components/ui/Pagination";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/EmptyState";
import { useUsers } from "@/hooks/useUsers";
import { UsersTable } from "@/features/users/components/UsersTable";
import { User } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const debouncedSearch = useDebounce(query, 300);

  // Build filters object
  const filters = {
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: itemsPerPage,
  };

  const { users, pagination, loading, createUser, updateUser, deleteUser } = useUsers(filters);

  // Reset to page 1 when search changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    if (user && user.role !== "Admin") {
      router.push("/");
    }
  }, [user, router]);

  if (user && user.role !== "Admin") {
    return null;
  }

  const handleAddUser = async (data: { name: string; email: string; password?: string; role: string; programIds?: string[] }) => {
    try {
      if (!data.password) {
        alert("Password is required");
        return;
      }
      await createUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role as "Admin" | "Healthcare Staff" | "Guest",
        programIds: data.programIds,
      });
      setAddOpen(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleEditUser = async (data: { name: string; email: string; password?: string; role: string; programIds?: string[] }) => {
    if (!selectedUser) return;
    try {
      const updateData: any = {
        name: data.name,
        email: data.email,
        role: data.role as "Admin" | "Healthcare Staff" | "Guest",
      };
      if (data.password && data.password.trim()) {
        updateData.password = data.password;
      }
      if (data.programIds !== undefined) {
        updateData.programIds = data.programIds;
      }
      await updateUser(selectedUser.id, updateData);
      setEditOpen(false);
      setSelectedUser(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm(`Are you sure you want to delete this user?`)) return;
    try {
      await deleteUser(id);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="User Management"
          description="Manage system users, assign roles, and control access permissions for your healthcare team"
          action={
            <Button
              onClick={() => setAddOpen(true)}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Add User
            </Button>
          }
        />

        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search users by name or email address..."
        />

        {users.length === 0 && !loading ? (
          <EmptyState
            icon={<UsersIcon className="h-12 w-12 text-gray-400" />}
            title="No users found"
            description={query ? "No users match your search. Try adjusting your search criteria." : "Add your first user to get started."}
            action={
              <Button onClick={() => setAddOpen(true)}>
                Add User
              </Button>
            }
          />
        ) : (
          <>
            <UsersTable
              users={users}
              currentUserId={user?.id}
              onEdit={(u) => {
                setSelectedUser(u);
                setEditOpen(true);
              }}
              onDelete={handleDeleteUser}
            />
            {pagination && pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>

      <UserForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddUser}
        loading={loading}
      />

      <UserForm
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleEditUser}
        loading={loading}
        initialValues={selectedUser ? {
          name: selectedUser.name,
          email: selectedUser.email,
          role: selectedUser.role,
          programIds: selectedUser.assignedPrograms?.map((p: any) => p.id || p) || [],
        } : undefined}
      />
    </>
  );
}
