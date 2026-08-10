import React from "react";
import { formatRelativeTime } from "@/utils/formatters";

interface TimelineLog {
  id: string;
  status: string;
  description: string;
  createdAt: string;
}

interface TimelineCardProps {
  timelines?: TimelineLog[];
}

export const TimelineCard: React.FC<TimelineCardProps> = ({ timelines = [] }) => {
  if (timelines.length === 0) {
    return (
      <div className="p-6 bg-surface border border-border rounded-2xl text-center text-text-muted text-sm">
        No tracking logs found.
      </div>
    );
  }

  // Sort logs in chronological order so status advances downwards
  const sortedLogs = [...timelines].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="p-6 bg-surface border border-border/80 rounded-2xl flex flex-col gap-6 shadow-md">
      <h3 className="text-text-primary text-sm font-bold uppercase tracking-wider border-b border-border pb-2">
        Fulfillment Timeline
      </h3>

      <div className="relative border-l border-border ml-4 pl-6 flex flex-col gap-6">
        {sortedLogs.map((log) => (
          <div key={log.id} className="relative flex flex-col gap-1">
            {/* Timeline Dot */}
            <div className="absolute -left-[31px] top-1.5 w-4 h-4 bg-surface border-2 border-indigo-500 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-text-primary uppercase tracking-wider">{log.status}</span>
              <span className="text-xs text-text-muted">{formatRelativeTime(log.createdAt)}</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{log.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
export default TimelineCard;
