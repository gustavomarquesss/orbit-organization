"use client";

import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CardForm } from "@/components/cards/card-form";
import type { CardLookups, CardWithRelations } from "@/lib/queries/cards";
import type { MeetingDetails } from "@/lib/queries/meetings";

export function CardDetailModal({
  card,
  lookups,
  meetingDetails,
}: {
  card: CardWithRelations;
  lookups: CardLookups;
  meetingDetails: MeetingDetails | null;
}) {
  const router = useRouter();

  function close() {
    router.back();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Card</DialogTitle>
        </DialogHeader>
        <CardForm lookups={lookups} card={card} meetingDetails={meetingDetails} onSuccess={close} onCancel={close} />
      </DialogContent>
    </Dialog>
  );
}
