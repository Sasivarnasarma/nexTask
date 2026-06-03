import { Bell, Info } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useWebPush } from '@/hooks/useWebPush';

export const PushNotificationPrompt: React.FC = () => {
  const { isSupported, permission, isSubscribed, subscribe } = useWebPush();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    // Show prompt only if:
    // 1. Web Push is supported by the browser
    // 2. Notification permission is still 'default' (not granted/denied yet)
    // 3. User is not already subscribed
    // 4. User has not clicked "Don't show again" (saved in localStorage)
    // 5. User has not clicked "Maybe later" within the last 48 hours
    const hasDismissed = localStorage.getItem('nextask_push_prompt_dismissed') === 'true';
    const laterUntil = parseInt(localStorage.getItem('nextask_push_prompt_later_until') || '0', 10);
    const isPostponed = Date.now() < laterUntil;

    if (isSupported && permission === 'default' && !isSubscribed && !hasDismissed && !isPostponed) {
      // Delay showing the prompt slightly to allow the dashboard to load cleanly
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, isSubscribed]);

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleMaybeLater = () => {
    setShowPrompt(false);
    // Postpone prompting for 48 hours (2 days)
    const fortyEightHoursInMs = 48 * 60 * 60 * 1000;
    localStorage.setItem(
      'nextask_push_prompt_later_until',
      (Date.now() + fortyEightHoursInMs).toString(),
    );
    setShowInfoModal(true);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Suppress prompting again permanently for this device/browser
    localStorage.setItem('nextask_push_prompt_dismissed', 'true');
    setShowInfoModal(true);
  };

  const handleCloseAll = () => {
    setShowPrompt(false);
    setShowInfoModal(false);
  };

  if (!showPrompt && !showInfoModal) return null;

  if (showInfoModal) {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-6">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-black/80 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto">
            <Info size={24} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
              Prefer to decide later?
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed px-4">
              You can configure, enable, or disable push notifications at any time from your{' '}
              <span className="font-semibold text-zinc-200">Profile settings</span>.
            </p>
          </div>

          <div className="border-t border-zinc-800/80" />

          <button
            onClick={handleCloseAll}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all active:scale-[.98]"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-6">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-black/80 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950 border border-indigo-900 text-indigo-400 text-xs font-semibold mx-auto">
          <Bell size={13} className="animate-bounce" />
          Notification Opt-in
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            Enable Push Notifications
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed px-2">
            Get instant real-time alerts on task assignments and team comments even when nexTask is
            closed.
          </p>
        </div>

        <div className="border-t border-zinc-800/80" />

        <div className="flex flex-col gap-3">
          <button
            onClick={handleEnable}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all active:scale-[.98]"
          >
            Enable notifications
          </button>

          <button
            onClick={handleMaybeLater}
            className="w-full py-3 rounded-xl text-sm font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-all active:scale-[.98]"
          >
            Maybe later
          </button>
          <button
            onClick={handleDismiss}
            className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors mt-2"
          >
            Don't ask again on this device
          </button>
        </div>
      </div>
    </div>
  );
};
