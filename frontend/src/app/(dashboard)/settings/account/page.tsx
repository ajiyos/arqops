"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiResponse, User } from "@/types";
import { Loader2, Check, AlertCircle } from "lucide-react";

export default function AccountPage() {
  const queryClient = useQueryClient();

  const { data: me, isLoading } = useQuery({
    queryKey: ["tenant", "me"],
    queryFn: async () => {
      const { data: res } = await apiClient.get<ApiResponse<User>>("/api/v1/tenant/me");
      return res.data!;
    },
  });

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (me) setName(me.name);
  }, [me]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      await apiClient.put("/api/v1/tenant/me", { name: name.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", "me"] });
      const stored = localStorage.getItem("user");
      if (stored) {
        try {
          const u = JSON.parse(stored);
          u.name = name.trim();
          localStorage.setItem("user", JSON.stringify(u));
        } catch { /* ignore */ }
      }
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/api/v1/tenant/me/change-password", { currentPassword, newPassword });
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
  });

  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="acc-name">Name</label>
            <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input value={me?.email ?? ""} disabled />
            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Roles</label>
            <div className="flex flex-wrap gap-1">
              {(me?.roles ?? []).map((r) => (
                <span key={r} className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {r}
                </span>
              ))}
            </div>
          </div>

          {profileMutation.isSuccess && (
            <p className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Profile updated.
            </p>
          )}
          {profileMutation.isError && (
            <p className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> Could not update profile.
            </p>
          )}
          <Button
            type="button"
            disabled={!name.trim() || name.trim() === me?.name || profileMutation.isPending}
            onClick={() => profileMutation.mutate()}
          >
            {profileMutation.isPending ? "Saving…" : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="cur-pass">Current password</label>
            <Input
              id="cur-pass"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="new-pass">New password</label>
            <Input
              id="new-pass"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="confirm-pass">Confirm new password</label>
            <Input
              id="confirm-pass"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {passwordMismatch && (
              <p className="text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>

          {passwordMutation.isSuccess && (
            <p className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4" /> Password changed successfully.
            </p>
          )}
          {passwordMutation.isError && (
            <p className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> Failed to change password. Is the current password correct?
            </p>
          )}
          <Button
            type="button"
            disabled={
              !currentPassword || !newPassword || !confirmPassword || passwordMismatch || passwordMutation.isPending
            }
            onClick={() => passwordMutation.mutate()}
          >
            {passwordMutation.isPending ? "Changing…" : "Change password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
