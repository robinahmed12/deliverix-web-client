"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils/formatters";
import type { AssignmentHistoryEntry, AssignmentStatus } from "../types";

const STATUS_CONFIG: Record<AssignmentStatus, { label: string; className: string }> = {
  Offered: {
    label: "Offered",
    className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  },
  Accepted: {
    label: "Accepted",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  },
  Rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  },
  Expired: {
    label: "Expired",
    className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  },
  Withdrawn: {
    label: "Withdrawn",
    className: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700",
  },
  Released: {
    label: "Released",
    className: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
  },
  Completed: {
    label: "Completed",
    className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  },
};

interface AssignmentHistoryTableProps {
  history: AssignmentHistoryEntry[];
  isLoading?: boolean;
}

export function AssignmentHistoryTable({
  history,
  isLoading = false,
}: AssignmentHistoryTableProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading assignment history…</p>;
  }

  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No assignment offers have been made for this order yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Driver</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Offered</TableHead>
          <TableHead>Resolved</TableHead>
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.map((entry) => {
          const config = STATUS_CONFIG[entry.status] ?? { label: entry.status, className: "" };
          const resolvedAt = entry.acceptedAt ?? entry.rejectedAt ?? entry.withdrawnAt ?? entry.releasedAt ?? entry.completedAt;
          const reason = entry.reasonText ?? entry.reasonCode;
          return (
            <TableRow key={entry.id}>
              <TableCell className="font-medium">{entry.driverCode}</TableCell>
              <TableCell>
                <Badge variant="outline" className={config.className}>
                  {config.label}
                </Badge>
              </TableCell>
              <TableCell>{formatDateTime(entry.offeredAt)}</TableCell>
              <TableCell>{resolvedAt ? formatDateTime(resolvedAt) : "—"}</TableCell>
              <TableCell className="text-muted-foreground">{reason ?? "—"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}