"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils/formatters";
import { useAuditLogsInfinite } from "../queries";
import type { AuditListParams } from "../types";

export function AuditLogsView() {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [action, setAction] = React.useState("");
  const [resourceType, setResourceType] = React.useState("");

  const [filters, setFilters] = React.useState<
    Omit<AuditListParams, "cursor" | "pageSize">
  >({});

  const query = useAuditLogsInfinite(filters);
  const entries = query.data?.pages.flatMap((p) => p.entries) ?? [];

  const applyFilters = () => {
    setFilters({
      ...(from ? { from: new Date(from).toISOString() } : {}),
      ...(to ? { to: new Date(to).toISOString() } : {}),
      ...(action.trim() ? { action: action.trim() } : {}),
      ...(resourceType.trim() ? { resourceType: resourceType.trim() } : {}),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">From</span>
            <Input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-52"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">To</span>
            <Input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-52"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Action</span>
            <Input
              placeholder="e.g. order.status.update"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-64"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Resource type</span>
            <Input
              placeholder="e.g. order, driver"
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-48"
            />
          </label>
          <Button onClick={applyFilters}>Apply filters</Button>
        </CardContent>
      </Card>

      {query.isLoading && !entries.length && (
        <p className="text-sm text-muted-foreground">Loading audit log…</p>
      )}

      {!query.isLoading && entries.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No audit records match the current filters.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <TableRow>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(entry.occurredAt)}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{entry.actorId}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{entry.action}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">
                        {entry.resourceType}:
                        <span className="text-muted-foreground">
                          {entry.resourceId}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry.result === "success" ? "default" : "destructive"
                        }
                      >
                        {entry.result}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.ip ?? "—"}</TableCell>
                  </TableRow>
                  {(entry.before || entry.after || entry.reason) && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View change details
                          </summary>
                          <div className="mt-2 grid grid-cols-2 gap-4 overflow-x-auto">
                            <div>
                              <p className="mb-1 font-medium">Before</p>
                              <pre className="rounded-md bg-muted p-2 font-mono text-xs">
                                {entry.before
                                  ? JSON.stringify(entry.before, null, 2)
                                  : "—"}
                              </pre>
                            </div>
                            <div>
                              <p className="mb-1 font-medium">After</p>
                              <pre className="rounded-md bg-muted p-2 font-mono text-xs">
                                {entry.after
                                  ? JSON.stringify(entry.after, null, 2)
                                  : "—"}
                              </pre>
                            </div>
                          </div>
                          {entry.reason && (
                            <p className="mt-2">
                              <span className="font-medium">Reason:</span>{" "}
                              {entry.reason}
                            </p>
                          )}
                        </details>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {query.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}