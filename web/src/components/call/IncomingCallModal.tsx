import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { useIncomingCall } from '../../context/IncomingCallContext';
import { useCallSettings } from '../../context/CallSettingsContext';
import { useToast } from '../../context/ToastContext';
import { getLanguage } from '../../data/languages';

/** Full-screen ringing card with Accept / Decline, shown over any page. */
export function IncomingCallModal() {
  const { incoming, accept, decline } = useIncomingCall();
  const { settings } = useCallSettings();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [joining, setJoining] = useState(false);

  if (!incoming) return null;

  const onAccept = async () => {
    setJoining(true);
    try {
      const roomCode = await accept(settings.myLanguage);
      navigate(`/call/${roomCode}`);
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Couldn’t join the call.', 'error');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-sm animate-fade-in" role="alertdialog" aria-modal="true" aria-label={`Incoming call from ${incoming.callerName}`}>
      <div className="w-full max-w-sm rounded-3xl bg-stone-900 p-8 text-center text-white shadow-2xl ring-1 ring-white/10 animate-fade-up">
        <p className="text-xs font-medium uppercase tracking-wider text-accent-300">Incoming video call</p>
        <div className="relative mx-auto mt-6 w-fit">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-accent-400/40" aria-hidden />
          <Avatar name={incoming.callerName} size="lg" className="relative" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold">{incoming.callerName}</h2>
        <p className="mt-1 text-sm text-stone-400">
          Speaks {getLanguage(incoming.callerLanguage).name} · you’ll speak {getLanguage(settings.myLanguage).name}
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button variant="danger" size="lg" leftIcon={<PhoneOff className="size-5" />} onClick={decline} disabled={joining}>
            Decline
          </Button>
          <Button variant="success" size="lg" leftIcon={<Phone className="size-5" />} onClick={onAccept} loading={joining}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
