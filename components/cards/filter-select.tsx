"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { id: string; label: string }[];
}) {
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(!v || v === "all" ? "" : v)}>
      <SelectTrigger size="sm" className="h-8">
        <SelectValue placeholder={placeholder}>
          {(v: string) => (v === "all" ? placeholder : (options.find((o) => o.id === v)?.label ?? placeholder))}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
