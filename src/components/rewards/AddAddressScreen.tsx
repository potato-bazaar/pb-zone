"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  EMPTY_ADDRESS,
  INDIAN_STATES,
  loadRewardAddress,
  saveRewardAddress,
  type RewardAddress,
} from "@/lib/rewardClaim";

type FieldKey = keyof RewardAddress;

const LABEL_CLASS =
  "mb-1.5 block text-left text-[12px] font-medium leading-none text-[#1a1a2e]";

const INPUT_CLASS =
  "w-full rounded-[0.85rem] border border-[#E5E9F2] bg-white px-3.5 py-3 text-[14px] font-semibold text-[#1a1a2e] outline-none placeholder:text-[#C4C9D6] focus:border-[#2940B3]";

const FIELDS: {
  key: Exclude<FieldKey, "phone" | "state">;
  label: string;
  type?: string;
}[] = [
  { key: "fullName", label: "Full Name" },
  { key: "pincode", label: "Pincode", type: "text" },
  { key: "addressLine1", label: "Address Line 1" },
  { key: "addressLine2", label: "Address Line 2 (Optional)" },
  { key: "city", label: "City" },
];

function stripPhonePrefix(phone: string) {
  return phone.replace(/^\+91\s*/, "").replace(/\D/g, "").slice(0, 10);
}

function formatPhoneForSave(local: string) {
  const digits = stripPhonePrefix(local);
  return digits ? `+91 ${digits}` : "";
}

export function AddAddressScreen({ tierId }: { tierId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<RewardAddress>(EMPTY_ADDRESS);
  const [confirmed, setConfirmed] = useState(false);
  const [touched, setTouched] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const stateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadRewardAddress();
    if (!saved) return;
    setForm({
      ...saved,
      phone: stripPhonePrefix(saved.phone),
    });
  }, []);

  useEffect(() => {
    if (!stateOpen) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (!stateRef.current?.contains(e.target as Node)) {
        setStateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [stateOpen]);

  const requiredFilled =
    form.fullName.trim() &&
    stripPhonePrefix(form.phone).length === 10 &&
    form.pincode.trim() &&
    form.addressLine1.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    confirmed;

  function updateField(key: FieldKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!requiredFilled) return;
    saveRewardAddress({
      ...form,
      phone: formatPhoneForSave(form.phone),
    });
    router.push(`/rewards/claim/${tierId}/confirm`);
  }

  return (
    <div className="relative mx-auto h-dvh w-full max-w-screen-sm bg-white">
      <div
        className="h-full overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        style={{
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header
          className="sticky top-0 z-30 bg-white px-4 pb-3"
          style={{ paddingTop: "var(--header-top)" }}
        >
          <div className="relative flex items-center justify-center">
            <Link
              href="/rewards"
              aria-label="Back"
              className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#EBEEF2] text-[#2940B3]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <h1 className="font-display text-lg font-bold text-[#2940B3]">
              Add Address
            </h1>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="px-4 pt-8 pb-2">
          <h2 className="font-display text-[1.1rem] font-extrabold text-[#2940B3]">
            Enter your delivery details
          </h2>
          <p className="mt-1.5 text-[13px] font-medium leading-snug text-[#8B93A7]">
            Please provide accurate details to receive your reward.
          </p>

          <div className="mt-5 space-y-3.5">
            <label className="block">
              <span className={LABEL_CLASS}>Full Name</span>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                className={INPUT_CLASS}
                autoComplete="off"
              />
            </label>

            <label className="block">
              <span className={LABEL_CLASS}>Phone Number</span>
              <div className="flex items-center rounded-[0.85rem] border border-[#E5E9F2] bg-white focus-within:border-[#2940B3]">
                <span className="shrink-0 pl-3.5 text-[14px] font-semibold text-[#1a1a2e]">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(e) =>
                    updateField("phone", stripPhonePrefix(e.target.value))
                  }
                  className="min-w-0 flex-1 bg-transparent px-2 py-3 text-[14px] font-semibold text-[#1a1a2e] outline-none placeholder:text-[#C4C9D6]"
                  placeholder="98765 43210"
                  autoComplete="off"
                  maxLength={10}
                />
              </div>
            </label>

            {FIELDS.filter((f) => f.key !== "fullName").map((field) => (
              <label key={field.key} className="block">
                <span className={LABEL_CLASS}>{field.label}</span>
                <input
                  type={field.type ?? "text"}
                  value={form[field.key]}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className={INPUT_CLASS}
                  autoComplete="off"
                />
              </label>
            ))}

            {/* Custom state dropdown — always opens below */}
            <div className="relative z-20 block" ref={stateRef}>
              <span className={LABEL_CLASS}>State</span>
              <button
                type="button"
                onClick={() => {
                  // Dismiss iOS form accessory (▲▼✓) / keyboard when opening custom dropdown
                  if (
                    typeof document !== "undefined" &&
                    document.activeElement instanceof HTMLElement
                  ) {
                    document.activeElement.blur();
                  }
                  setStateOpen((open) => !open);
                }}
                className={`${INPUT_CLASS} flex items-center justify-between gap-2 text-left ${
                  stateOpen ? "border-[#2940B3]" : ""
                }`}
                aria-haspopup="listbox"
                aria-expanded={stateOpen}
              >
                <span
                  className={
                    form.state ? "text-[#1a1a2e]" : "text-[#C4C9D6]"
                  }
                >
                  {form.state || "Select state"}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 shrink-0 text-[#A0A7B8] transition ${
                    stateOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {stateOpen ? (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-52 overflow-y-auto rounded-[0.85rem] border border-[#E5E9F2] bg-white py-1 shadow-[0_10px_28px_rgba(26,26,46,0.14)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {INDIAN_STATES.map((state) => (
                    <li key={state} role="option" aria-selected={form.state === state}>
                      <button
                        type="button"
                        onClick={() => {
                          updateField("state", state);
                          setStateOpen(false);
                        }}
                        className={`flex w-full px-3.5 py-2.5 text-left text-[14px] font-semibold transition ${
                          form.state === state
                            ? "bg-[#F0EDFF] text-[#6A5AE0]"
                            : "text-[#1a1a2e] active:bg-[#F5F6FA]"
                        }`}
                      >
                        {state}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <label className="mt-5 flex items-start gap-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={confirmed}
              onClick={() => setConfirmed((v) => !v)}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition ${
                confirmed
                  ? "border-[#2940B3] bg-[#2940B3]"
                  : "border-[#C4C9D6] bg-white"
              }`}
            >
              {confirmed ? (
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden
                >
                  <path d="M2 6l3 3 5-5" strokeLinecap="round" />
                </svg>
              ) : null}
            </button>
            <span className="text-[13px] font-semibold leading-snug text-[#2940B3]">
              I confirm that the above details are correct and I want to receive
              this reward.
            </span>
          </label>

          {touched && !requiredFilled ? (
            <p className="mt-3 text-[12px] font-medium text-[#EF4444]">
              Please fill all required fields and confirm the details.
            </p>
          ) : null}

          <button
            type="submit"
            className="mt-6 flex w-full items-center justify-center rounded-[0.95rem] bg-[#6A5AE0] py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(106,90,224,0.35)] transition active:scale-[0.99]"
          >
            Submit Address
          </button>
        </form>
      </div>
    </div>
  );
}
