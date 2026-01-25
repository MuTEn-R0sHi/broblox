"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

// ============================================================================
// Simple Select Component (dropdown with custom styling)
// ============================================================================

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within a Select");
  }
  return context;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

function Select({ value = "", onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(value);

  const actualValue = value ?? internalValue;
  const handleChange = onValueChange ?? setInternalValue;

  return (
    <SelectContext.Provider
      value={{
        value: actualValue,
        onValueChange: (v) => {
          handleChange(v);
          setOpen(false);
        },
        open,
        setOpen,
      }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
}

function SelectTrigger({ className, children }: SelectTriggerProps) {
  const { open, setOpen } = useSelectContext();

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {children}
      <ChevronDown
        className={cn("h-4 w-4 opacity-50 transition-transform", open && "rotate-180")}
      />
    </button>
  );
}

interface SelectValueProps {
  placeholder?: string;
}

function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useSelectContext();
  return <span className={cn(!value && "text-muted-foreground")}>{value || placeholder}</span>;
}

interface SelectContentProps {
  children: React.ReactNode;
}

function SelectContent({ children }: SelectContentProps) {
  const { open, setOpen } = useSelectContext();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 z-50 mt-1 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
    >
      <div className="p-1 max-h-60 overflow-auto">{children}</div>
    </div>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

function SelectItem({ value, children }: SelectItemProps) {
  const { value: selectedValue, onValueChange } = useSelectContext();
  const isSelected = selectedValue === value;

  return (
    <div
      onClick={() => onValueChange(value)}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground"
      )}
    >
      {children}
      {isSelected && (
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
