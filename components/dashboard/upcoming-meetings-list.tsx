import Link from "next/link";

import type { UpcomingMeeting } from "@/lib/queries/dashboard";

export function UpcomingMeetingsList({ meetings }: { meetings: UpcomingMeeting[] }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium">Próximas reuniões</h3>
      {meetings.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma reunião agendada.</p>
      ) : (
        <ul className="space-y-2">
          {meetings.map((meeting) => (
            <li key={meeting.cardId}>
              <Link
                href={`/cards/${meeting.cardId}`}
                className="flex items-center justify-between gap-2 text-sm hover:underline"
              >
                <span className="min-w-0 truncate">📅 {meeting.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(`${meeting.meetingDate}T00:00:00`).toLocaleDateString("pt-BR")}
                  {meeting.meetingTime ? ` ${meeting.meetingTime.slice(0, 5)}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
