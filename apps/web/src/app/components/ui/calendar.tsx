"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./Button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium text-[#03045E]",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "absolute left-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse space-x-1",
        weekdays: "flex",
        weekday: "text-[#94A3B8] rounded-md w-8 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          props.mode === "range"
            ? "[&:has(>.range_end)]:rounded-r-full [&:has(>.range_start)]:rounded-l-full first:[&:has([aria-selected])]:rounded-l-full last:[&:has([aria-selected])]:rounded-r-full"
            : "[&:has([aria-selected])]:rounded-full",
        ),
        day_button: cn(
          "size-8 p-0 font-normal rounded-full transition-colors text-[#0F172A]",
          "hover:bg-[#E0F2FE] hover:text-[#0077B6]",
          "aria-selected:opacity-100",
        ),
        range_start: "aria-selected:bg-[#0077B6] aria-selected:text-white",
        range_end: "aria-selected:bg-[#0077B6] aria-selected:text-white",
        selected: "bg-[#0077B6] text-white hover:bg-[#0077B6] hover:text-white focus:bg-[#0077B6] focus:text-white rounded-full",
        today: "font-bold text-[#00B4D8]",
        outside: "text-[#CBD5E1] opacity-50 aria-selected:text-[#CBD5E1]",
        disabled: "text-[#CBD5E1] opacity-40",
        range_middle: "aria-selected:bg-[#E0F2FE] aria-selected:text-[#0077B6]",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", chevronClass)} />
          ) : (
            <ChevronRight className={cn("size-4", chevronClass)} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
