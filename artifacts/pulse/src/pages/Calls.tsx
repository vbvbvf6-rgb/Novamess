import React from "react";
import { useGetCallHistory } from "@workspace/api-client-react";
import { Phone, Video, PhoneMissed, PhoneForwarded, PhoneIncoming } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

export default function Calls() {
  const { data: calls, isLoading } = useGetCallHistory();
  const { currentUserId, startCall } = useAppContext();
  const { toast } = useToast();

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0">
        <h1 className="text-xl font-bold">Calls</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-3xl w-full mx-auto scrollbar-thin">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/50">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="w-8 h-8 rounded-full" />
              </div>
            ))}
          </div>
        ) : calls?.length === 0 ? (
          <div className="text-center text-muted-foreground mt-20">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone size={32} className="text-muted-foreground/50" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">No call history</h2>
            <p>Your recent calls will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {calls?.map((call) => {
              const isOutgoing = call.callerId === currentUserId;
              const otherUser = isOutgoing ? call.callee : call.caller;
              const isMissed = call.status === 'missed';
              const isVideo = call.type === 'video';

              return (
                <div key={call.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors group">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0"
                    style={{ backgroundColor: otherUser?.avatarColor || '#333' }}
                  >
                    {otherUser?.avatarUrl ? (
                      <img src={otherUser.avatarUrl} alt={otherUser.displayName || ''} className="w-full h-full object-cover" />
                    ) : (
                      (otherUser?.displayName || "U")[0].toUpperCase()
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold truncate ${isMissed ? 'text-destructive' : 'text-foreground'}`}>
                      {otherUser?.displayName || 'Unknown'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                      {isMissed ? (
                        <PhoneMissed size={14} className="text-destructive" />
                      ) : isOutgoing ? (
                        <PhoneForwarded size={14} />
                      ) : (
                        <PhoneIncoming size={14} />
                      )}
                      <span>
                        {call.startedAt ? formatDistanceToNow(new Date(call.startedAt), { addSuffix: true }) : 'Unknown time'}
                      </span>
                      {call.durationSeconds ? (
                        <>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                          <span>{Math.floor(call.durationSeconds / 60)}:{String(call.durationSeconds % 60).padStart(2, '0')}</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const calleeId = isOutgoing ? call.calleeId : call.callerId;
                        if (!calleeId) return;
                        try {
                          await startCall(calleeId, call.chatId ?? null, isVideo ? "video" : "audio");
                        } catch {
                          toast({ title: "Не удалось начать звонок", description: "Проверьте доступ к микрофону/камере", variant: "destructive" });
                        }
                      }}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Перезвонить"
                    >
                      {isVideo ? <Video size={20} /> : <Phone size={20} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
