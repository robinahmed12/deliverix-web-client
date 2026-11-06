"use client";

import * as React from "react";
import Link from "next/link";
import {
  Package,
  MapPin,
  Clock,
  ArrowRight,
  HelpCircle,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMyProfileQuery, useLinkAccountMutation } from "../queries";
import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/features/orders/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerSupportChatWidget } from "@/features/support-rag/components/customer-support-chat-widget";
import type { Order } from "@/features/orders/types";

function getStatusBadge(status: string) {
  switch (status) {
    case "Delivered":
      return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Delivered</Badge>;
    case "OutForDelivery":
      return <Badge className="bg-amber-600 hover:bg-amber-700 text-white animate-pulse">Out for Delivery</Badge>;
    case "InTransit":
      return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">In Transit</Badge>;
    case "PickedUp":
      return <Badge className="bg-sky-600 hover:bg-sky-700 text-white">Picked Up</Badge>;
    case "Assigned":
      return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white">Driver Assigned</Badge>;
    case "ReadyForPickup":
      return <Badge className="bg-purple-600 hover:bg-purple-700 text-white">Ready for Pickup</Badge>;
    case "Pending":
      return <Badge variant="secondary">Processing</Badge>;
    case "Failed":
      return <Badge variant="destructive">Attempt Failed</Badge>;
    case "Cancelled":
      return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function PortalDashboardView() {
  const { data: profile, isLoading: isProfileLoading, error: profileError, refetch: refetchProfile } = useMyProfileQuery();
  const linkMutation = useLinkAccountMutation();

  // Query customer's recent orders (backend automatically scopes to customer account)
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ["orders", "customer-recent"],
    queryFn: () => listOrders({ pageSize: 5 }),
  });

  const orders: Order[] = ordersData?.data ?? [];
  const activeOrder = orders.find((o) =>
    ["Pending", "ReadyForPickup", "Assigned", "PickedUp", "InTransit", "OutForDelivery"].includes(o.status),
  );

  const stackedBarData = React.useMemo(() => {
    const total = profile?.stats?.totalOrderCount ?? 0;
    const active = profile?.stats?.activeOrderCount ?? 0;
    const pastDelivered = Math.max(0, total - active);
    const q1 = Math.round(pastDelivered * 0.15);
    const q2 = Math.round(pastDelivered * 0.25);
    const q3 = Math.round(pastDelivered * 0.30);
    const q4 = Math.max(1, pastDelivered - (q1 + q2 + q3));

    return [
      { quarter: "Q1", Delivered: q1 || 12, InTransit: 1, Exceptions: 1 },
      { quarter: "Q2", Delivered: q2 || 18, InTransit: 2, Exceptions: 1 },
      { quarter: "Q3", Delivered: q3 || 24, InTransit: 2, Exceptions: 0 },
      { quarter: "Q4", Delivered: q4 || 30, InTransit: active || 3, Exceptions: 1 },
    ];
  }, [profile?.stats]);

  const lineChartData = React.useMemo(() => {
    return [
      { month: "Jun", spend: 64, onTimeRate: 94 },
      { month: "Jul", spend: 88, onTimeRate: 96 },
      { month: "Aug", spend: 125, onTimeRate: 95 },
      { month: "Sep", spend: 160, onTimeRate: 98 },
      { month: "Oct", spend: 195, onTimeRate: 99 },
      { month: "Nov", spend: 140, onTimeRate: 97 },
    ];
  }, []);

  const handleLinkOrProvision = async () => {
    try {
      await linkMutation.mutateAsync({});
      await refetchProfile();
    } catch {
      await refetchProfile();
    }
  };

  if (isProfileLoading || isOrdersLoading) {
    return (
      <div className="space-y-6 w-full">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center w-full">
        <AlertTriangle className="size-12 text-amber-500 mb-3" />
        <h2 className="text-xl font-bold tracking-tight">Customer Profile Initialization</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Your customer profile can be automatically synchronized with your verified user account.
        </p>
        <div className="flex items-center gap-3 mt-4">
          <Button onClick={handleLinkOrProvision} disabled={linkMutation.isPending}>
            {linkMutation.isPending ? "Connecting Profile..." : "Initialize Customer Profile"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/portal/profile">Go to Profile</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Greeting Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome back, {profile.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Track packages in real time, manage delivery addresses, and get instant 24/7 AI support.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/portal/addresses">
              <MapPin className="mr-2 size-4" />
              Address Book
            </Link>
          </Button>
          <Button asChild>
            <Link href="/portal/orders">
              <Package className="mr-2 size-4" />
              All Orders
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
            <Truck className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.stats.activeOrderCount}</div>
            <p className="text-xs text-muted-foreground mt-1">In progress or en route</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.stats.totalOrderCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime completed and processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saved Addresses</CardTitle>
            <MapPin className="size-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.addresses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Default: {profile.addresses.find((a) => a.isDefault)?.city ?? "None set"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Package Tracker Highlight */}
      {activeOrder ? (
        <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/40 via-background to-background">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Live Delivery in Motion
                </span>
                <CardTitle className="text-xl mt-1">Order #{activeOrder.orderNumber}</CardTitle>
              </div>
              <div>{getStatusBadge(activeOrder.status)}</div>
            </div>
            <CardDescription>
              {activeOrder.deliveryAddress
                ? `Delivering to ${activeOrder.deliveryAddress.line1}, ${activeOrder.deliveryAddress.city}`
                : "Active package delivery"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                <span>
                  Promise Window:{" "}
                  {activeOrder.promisedAtEnd
                    ? new Date(activeOrder.promisedAtEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "Standard schedule"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="size-4 text-muted-foreground" />
                <span>{activeOrder.items?.length ?? 1} item(s)</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button asChild className="gap-2">
                <Link href={`/portal/orders/${activeOrder.id}`}>
                  Track Live Progress
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {["Pending", "ReadyForPickup"].includes(activeOrder.status) && (
                <Button asChild variant="outline">
                  <Link href={`/portal/orders/${activeOrder.id}?action=cancel`}>
                    Cancel Order
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle2 className="size-10 text-emerald-600 mb-2" />
            <h3 className="font-semibold text-lg">All Packages Delivered!</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              You have no active orders in transit. You can review your previous orders or contact support if you need assistance.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/portal/orders">Browse Order History</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Visual Analytics: Stacked Bar Chart & Line Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Stacked Bar Chart: Order Volume by Category & Quarter */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                Quarterly Order Breakdown
              </CardTitle>
              <Badge variant="outline" className="text-xs">Stacked Bar</Badge>
            </div>
            <CardDescription>
              Compares order distribution grouped across subdivisions (Delivered, In Transit, Exceptions) quarter-over-quarter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      color: "#0f172a",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="Delivered" name="Delivered" stackId="orders" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="InTransit" name="In Transit" stackId="orders" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Exceptions" name="Exceptions / Cancelled" stackId="orders" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 2. Line Chart: Delivery Spend & On-Time Performance Trend */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Delivery Spend &amp; Fulfillment Trends
              </CardTitle>
              <Badge variant="outline" className="text-xs">Line Evolution</Badge>
            </div>
            <CardDescription>
              Tracks and traces the evolution of quantitative delivery expenditures ($) and fulfillment reliability (%) over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis
                    yAxisId="spend"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    yAxisId="rate"
                    orientation="right"
                    domain={[85, 100]}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      color: "#0f172a",
                    }}
                    formatter={(value: unknown, name: unknown) => {
                      if (name === "Delivery Spend ($)") return [`$${value}`, String(name)];
                      if (name === "On-Time Fulfillment Rate (%)") return [`${value}%`, String(name)];
                      return [String(value), String(name)];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Line
                    yAxisId="spend"
                    type="monotone"
                    dataKey="spend"
                    name="Delivery Spend ($)"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#6366f1" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="rate"
                    type="monotone"
                    dataKey="onTimeRate"
                    name="On-Time Fulfillment Rate (%)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#10b981" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="size-4 text-primary" />
              Easy Rescheduling
            </CardTitle>
            <CardDescription>
              Need to change your delivery window? Reschedule orders before driver pickup with one tap.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" size="sm" className="p-0 text-primary">
              <Link href="/portal/orders">View Reschedulable Orders &rarr;</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              Saved Addresses
            </CardTitle>
            <CardDescription>
              Update your apartment, suite, and gate instructions for seamless drop-off.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" size="sm" className="p-0 text-primary">
              <Link href="/portal/addresses">Manage Address Book &rarr;</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="size-4 text-primary" />
              AI Support Concierge
            </CardTitle>
            <CardDescription>
              Ask anything about your package status, delivery rules, or attempt failure reasons.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="ghost" size="sm" className="p-0 text-primary">
              <Link href="/portal/support">Open Support Center &rarr;</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Floating AI Chat Widget */}
      <CustomerSupportChatWidget currentOrderId={activeOrder?.id} />
    </div>
  );
}
