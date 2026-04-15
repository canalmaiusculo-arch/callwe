'use client';

const PARTNER_ID = process.env.NEXT_PUBLIC_CLOUDTALK_PARTNER_ID ?? '';

export function SoftphoneFrame() {
  return (
    <iframe
      title="CloudTalk Softphone"
      src={`https://phone.cloudtalk.io/?partner=${PARTNER_ID}`}
      allow="microphone; camera; autoplay; clipboard-read; clipboard-write"
      className="h-[640px] w-full rounded-lg border"
    />
  );
}
