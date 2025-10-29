"use client";

import { Card, CardBody } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { BellIcon, PaintBrushIcon } from "@heroicons/react/24/outline";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="text-xs md:text-sm text-gray-600 mt-1">Customize your notification preferences and manage application appearance settings to match your workflow needs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-5 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-600 mt-1">Choose what you want to be notified about</p>
          </div>
          <CardBody>
            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#0066cc] hover:bg-blue-50 transition-all cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-0.5 rounded border-gray-300 text-[#0066cc] focus:ring-[#0066cc]" />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">Medication overdue alerts</div>
                  <div className="text-xs text-gray-600 mt-0.5">Get notified when medications are overdue for dispensation</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#0066cc] hover:bg-blue-50 transition-all cursor-pointer">
                <input type="checkbox" defaultChecked className="mt-0.5 rounded border-gray-300 text-[#0066cc] focus:ring-[#0066cc]" />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">Session starting soon</div>
                  <div className="text-xs text-gray-600 mt-0.5">Receive reminders before scheduled sessions begin</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#0066cc] hover:bg-blue-50 transition-all cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded border-gray-300 text-[#0066cc] focus:ring-[#0066cc]" />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">New patient enrollment</div>
                  <div className="text-xs text-gray-600 mt-0.5">Get notified when new patients are enrolled</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#0066cc] hover:bg-blue-50 transition-all cursor-pointer">
                <input type="checkbox" className="mt-0.5 rounded border-gray-300 text-[#0066cc] focus:ring-[#0066cc]" />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">Program changes</div>
                  <div className="text-xs text-gray-600 mt-0.5">Notify me when programs are created or modified</div>
                </div>
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button>Save Preferences</Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <div className="p-5 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Appearance</h2>
            <p className="text-sm text-gray-600 mt-1">Customize your application theme</p>
          </div>
          <CardBody>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border-2 border-[#0066cc] bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">Light Mode</div>
                    <div className="text-sm text-gray-600 mt-1">Clean white interface with blue accents</div>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-[#0066cc] flex items-center justify-center text-white font-bold text-lg shadow-md">
                    L
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Theme customization options will be available in future updates.
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
