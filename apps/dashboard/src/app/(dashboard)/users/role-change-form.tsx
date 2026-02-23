"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { updateUserRole } from "./actions";

type RoleOption = { value: string; label: string };

export function RoleChangeForm({
  userId,
  defaultRole,
  roleOptions,
  disabled,
}: {
  userId: string;
  defaultRole: string;
  roleOptions: RoleOption[];
  disabled: boolean;
}) {
  const [role, setRole] = useState(defaultRole);
  const reasonRef = useRef<HTMLInputElement | null>(null);
  const confirmationRef = useRef<HTMLInputElement | null>(null);

  const expectedConfirmation = useMemo(() => `set role ${userId} ${role}`, [userId, role]);

  return (
    <form
      action={updateUserRole}
      className="flex items-center gap-2"
      onSubmit={(e) => {
        if (disabled) return;

        const reason = window.prompt("Reason for role change (min 5 chars):");
        if (!reason) {
          e.preventDefault();
          return;
        }

        const confirmation = window.prompt(`Type '${expectedConfirmation}' to confirm:`);
        if (!confirmation) {
          e.preventDefault();
          return;
        }

        if (reasonRef.current) reasonRef.current.value = reason;
        if (confirmationRef.current) confirmationRef.current.value = confirmation;
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input ref={reasonRef} type="hidden" name="reason" defaultValue="" />
      <input ref={confirmationRef} type="hidden" name="confirmation" defaultValue="" />

      <select
        name="role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        disabled={disabled}
        className="h-9 w-44 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {roleOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <Button type="submit" variant="secondary" disabled={disabled}>
        Save
      </Button>
    </form>
  );
}
