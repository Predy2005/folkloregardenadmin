import {Search, UserCog, Plus} from "lucide-react";
import {Input} from "@/shared/components/ui/input";
import {CardDescription, CardHeader, CardTitle} from "@/shared/components/ui/card";
import {Button} from "@/shared/components/ui/button";
import {PageHeader} from "@/shared/components/PageHeader";
import React from "react";

interface StaffHeaderProps {
  search: string;
  onSearchChange: (v: string) => void;
  staffCount: number;
  onCreateClick?: () => void;
}

export function StaffHeader({search: _search, onSearchChange: _onSearchChange, staffCount: _staffCount, onCreateClick}: StaffHeaderProps) {
  return (
    <PageHeader title="Personál" description="Správa členů týmu">
      <Button
        onClick={onCreateClick}
        className="bg-primary hover:bg-primary/90"
        data-testid="button-create-staff"
      >
        <Plus className="w-4 h-4 mr-2"/>
        Nový člen
      </Button>
    </PageHeader>
  );
}

export function StaffListHeader({search, onSearchChange, staffCount}: StaffHeaderProps) {
  // Only uses subset of props
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5"/>
            Členové týmu
          </CardTitle>
          <CardDescription>
            Celkem: {staffCount || 0} členů
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <Input
              placeholder="Hledat člena..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 w-64"
              data-testid="input-search-staff"
            />
          </div>
        </div>
      </div>
    </CardHeader>
  );
}
