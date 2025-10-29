"use client";

/**
 * Profile Page
 * User profile management page
 * Refactored for modularity and maintainability
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/Toast";
import { authService } from "@/services";
import { UserIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const updateData: { name?: string; password?: string; currentPassword?: string } = {};
      if (name !== user?.name) {
        updateData.name = name;
      }
      if (newPassword) {
        if (!currentPassword) {
          notify("Current password is required to change password", "error");
          setLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          notify("New passwords do not match", "error");
          setLoading(false);
          return;
        }
        if (newPassword.length < 6) {
          notify("Password must be at least 6 characters", "error");
          setLoading(false);
          return;
        }
        updateData.password = newPassword;
        updateData.currentPassword = currentPassword;
      }

      const response = await authService.updateProfile(updateData);
      if (response.data) {
        notify("Profile updated successfully", "success");
        if (updateUser) {
          updateUser({ ...user!, name: response.data.name || name });
        }
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        notify(response.error || "Failed to update profile", "error");
      }
    } catch (error) {
      notify("Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      notify("Please fill in all password fields", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      notify("New passwords do not match", "error");
      return;
    }
    if (newPassword.length < 6) {
      notify("Password must be at least 6 characters", "error");
      return;
    }
    setLoading(true);
    try {
      const response = await authService.updateProfile({
        password: newPassword,
        currentPassword,
      });
      if (response.data) {
        notify("Password updated successfully", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        notify(response.error || "Failed to update password", "error");
      }
    } catch (error) {
      notify("Failed to update password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">Profile</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-1">View and manage your profile information</p>
      </div>

      <Card className="lg:hidden">
        <CardBody>
          <div className="flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-2xl font-bold mb-4">
              {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{user?.name || "User"}</h3>
            <p className="text-sm text-gray-600 mb-4">{user?.email || "No email"}</p>
            <div className="w-full border-t border-gray-200 pt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">Status</span>
                <span className="text-gray-900 font-semibold">Active</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">Member Since</span>
                <span className="text-gray-900 font-semibold">Jan 2025</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">Role</span>
                <span className="text-gray-900 font-semibold">{user?.role || "Guest"}</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
              <p className="text-sm text-gray-600 mt-1">Update your personal details and account information. Changes will be reflected across the system.</p>
            </div>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name">
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Full Name" 
                    icon={<UserIcon className="h-5 w-5" />} 
                  />
                </Field>
                <Field label="Email">
                  <Input 
                    type="email" 
                    value={user?.email || ""} 
                    placeholder="Email" 
                    icon={<EnvelopeIcon className="h-5 w-5" />} 
                    disabled
                  />
                </Field>
                <Field label="Role">
                  <Select defaultValue={user?.role || "Guest"} disabled>
                    <option>Admin</option>
                    <option>Healthcare Staff</option>
                    <option>Guest</option>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Role cannot be changed</p>
                </Field>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleUpdateProfile} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Security Settings</h2>
              <p className="text-sm text-gray-600 mt-1">Change your password to keep your account secure. Use a strong password with at least 8 characters.</p>
            </div>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Current Password">
                  <PasswordInput 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    placeholder="Current password" 
                  />
                </Field>
                <Field label="New Password">
                  <PasswordInput 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="New password" 
                  />
                </Field>
                <Field label="Confirm Password">
                  <PasswordInput 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Confirm password" 
                  />
                </Field>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleUpdatePassword} disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="hidden lg:block space-y-6">
          <Card>
            <CardBody>
              <div className="flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-[#0066cc] flex items-center justify-center text-white text-3xl font-bold mb-4">
                  {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{user?.name || "User"}</h3>
                <p className="text-sm text-gray-600 mb-6">{user?.email || "No email"}</p>
                <div className="w-full border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Status</span>
                    <span className="text-gray-900 font-semibold">Active</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Member Since</span>
                    <span className="text-gray-900 font-semibold">Jan 2025</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Role</span>
                    <span className="text-gray-900 font-semibold">{user?.role || "Guest"}</span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
