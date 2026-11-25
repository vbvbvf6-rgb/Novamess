import { useState } from "react";
import { Loader2, Mic, PhoneOff } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

interface ChannelVoiceRoom {
  id: number;
  callId: number;
  hostId: number;
  name: string;
  chatId: number;
}

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function ChannelVoiceControl({
  chatId,
  chatName,
  canManage,
}: {
  chatId: number;
  chatName: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeCall, startCall, joinAudioRoom, endAudioRoom } = useAppContext();
  const [busy, setBusy] = useState(false);
  const queryKey = ["channel-audio-room", chatId];
  const { data: room, isLoading } = useQuery<ChannelVoiceRoom | null>({
    queryKey,
    enabled: Number.isSafeInteger(chatId) && chatId > 0,
    queryFn: async () => {
      const response = await fetch(`/api/audio-rooms?chatId=${chatId}`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Не удалось проверить голосовой чат");
      return response.json();
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const activeRoomId = Number((activeCall as any)?.roomId);
  const joined = !!room && activeCall?.type === "group" && activeRoomId === room.id;
  const hasOtherCall = !!activeCall && !joined;

  const enterRoom = async () => {
    if (busy || hasOtherCall) return;
    setBusy(true);
    try {
      if (room) {
        await joinAudioRoom(room.id);
      } else if (canManage) {
        await startCall(null, chatId, "group", `${chatName} — голосовой чат`);
      }
      await queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      toast({
        title: "Не удалось подключиться к голосовому чату",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const closeRoom = async () => {
    if (!room || busy) return;
    setBusy(true);
    try {
      await endAudioRoom(room.id);
      await queryClient.invalidateQueries({ queryKey });
      toast({ title: "Голосовой чат завершён" });
    } catch (error) {
      toast({
        title: "Не удалось завершить голосовой чат",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (!room && !canManage && !isLoading) return null;

  const actionLabel = isLoading
    ? "Проверяем голосовой чат"
    : joined
      ? "Вы в голосовом чате"
      : room
        ? "Подключиться к голосовому чату"
        : "Начать голосовой чат";

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={() => void enterRoom()}
        disabled={busy || isLoading || joined || hasOtherCall || (!room && !canManage)}
        aria-label={actionLabel}
        title={hasOtherCall ? "Сначала завершите текущий звонок" : actionLabel}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="button-channel-voice-room"
      >
        {busy || isLoading ? <Loader2 size={18} className="animate-spin" /> : <Mic size={19} className={room ? "text-emerald-400" : ""} />}
      </button>
      {room && canManage && (
        <button
          type="button"
          onClick={() => void closeRoom()}
          disabled={busy}
          aria-label="Завершить голосовой чат канала"
          title="Завершить голосовой чат"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          data-testid="button-end-channel-voice-room"
        >
          <PhoneOff size={17} />
        </button>
      )}
    </div>
  );
}
