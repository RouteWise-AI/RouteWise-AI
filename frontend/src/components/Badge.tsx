import React from 'react';
import type { TransportMode, DeadlineStatus } from '../types';
import { Train, Truck, Plane, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export const ModeBadge: React.FC<{ mode: TransportMode }> = ({ mode }) => {
  switch (mode) {
    case 'RAIL':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Train className="w-3.5 h-3.5" /> Rail Freight
        </span>
      );
    case 'AIR':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Plane className="w-3.5 h-3.5" /> Air Priority
        </span>
      );
    case 'EXPRESS_ROAD':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Truck className="w-3.5 h-3.5" /> Highway Express
        </span>
      );
    case 'ROAD':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <Truck className="w-3.5 h-3.5" /> Standard Road
        </span>
      );
  }
};

export const DeadlineBadge: React.FC<{ status: DeadlineStatus; marginHours: number }> = ({ status, marginHours }) => {
  if (status === 'ON_TIME') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> On Time (+{marginHours.toFixed(1)}h)
      </span>
    );
  }
  if (status === 'AT_RISK') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Tight Buffer (+{(marginHours * 60).toFixed(0)}m)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
      <XCircle className="w-3.5 h-3.5 text-rose-400" /> Late ({Math.abs(marginHours).toFixed(1)}h overdue)
    </span>
  );
};
