"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

export default function SidebarPanel({
  open,
  onClose,
  title,
  children,
  width = "w-[420px]",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child as={Fragment} enter="transform transition ease-out duration-200" enterFrom="translate-x-full" enterTo="translate-x-0" leave="transform transition ease-in duration-150" leaveFrom="translate-x-0" leaveTo="translate-x-full">
                <Dialog.Panel className={`pointer-events-auto ${width}`}>
                  <div className="flex h-full flex-col bg-white/90 backdrop-blur border-l border-gray-200 shadow-xl">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                      <Dialog.Title className="text-base font-bold text-gray-900">{title}</Dialog.Title>
                      <button onClick={onClose} className="px-2 py-1 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors">
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto p-5">
                      {children}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}


