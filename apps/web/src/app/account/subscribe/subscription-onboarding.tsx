"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Check, Leaf, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { PlanResponse, SubscriptionResponse } from "@carbon/contracts";

import { Button, LinkButton } from "../../../components/ui";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../../lib/api/client";
import { normalizeSubscriptionReturnTo } from "../../../lib/subscription-onboarding";

export function SubscriptionOnboarding({
  plans,
  returnTo,
  subscription,
}: Readonly<{
  plans: readonly PlanResponse["data"][];
  returnTo: string;
  subscription: SubscriptionResponse["data"] | null;
}>) {
  const router = useRouter();
  const idempotencyKey = useRef<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(plans[0]?.id ?? null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const destination = normalizeSubscriptionReturnTo(returnTo);

  async function activate() {
    if (!selectedPlanId || pending) return;
    idempotencyKey.current ??= crypto.randomUUID();
    setPending(true);
    setMessage(null);
    try {
      await createApiClient(createSameOriginApiTransport()).activateFreeTrial(
        { planId: selectedPlanId },
        idempotencyKey.current,
      );
      idempotencyKey.current = null;
      router.replace(destination);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? error.message
          : "We could not start your weekly plan. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  if (subscription?.status === "active" && subscription.billingStatus === "current") {
    return (
      <section className="mx-auto max-w-2xl py-8 text-center sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Weekly plan</p>
        <h2 className="mt-3 text-3xl font-bold text-ink sm:text-5xl">Your plan is ready</h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted">
          Your active plan is already connected to Carbon Market. Continue where you left off.
        </p>
        <LinkButton className="mt-8 !text-white" href={destination}>
          Return to shopping
        </LinkButton>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl py-2 sm:py-8">
      <LinkButton href={destination} size="sm" tone="ghost">
        <ArrowLeft size={15} /> Back to shopping
      </LinkButton>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(22rem,1fr)] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-market-green-dark">
            Carbon weekly membership
          </p>
          <h2 className="mt-3 max-w-xl text-4xl font-bold leading-tight text-ink sm:text-6xl">
            Make every weekly shop feel planned.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted">
            Pick the plan that fits your household. Your first calendar month is free, then the
            server-owned weekly fee and grocery credit apply to future cycles.
          </p>
          <div className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
            <Benefit
              copy="A focused weekly catalog."
              icon={<Leaf size={18} />}
              title="Fresh each week"
            />
            <Benefit
              copy="Plan credit is applied at checkout."
              icon={<Check size={18} />}
              title="Credit included"
            />
            <Benefit
              copy="Pause, skip, or cancel from account."
              icon={<ShieldCheck size={18} />}
              title="Stay in control"
            />
          </div>
        </div>
        <div className="border border-line bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                Choose your plan
              </p>
              <h2 className="mt-2 text-2xl font-bold text-ink">Weekly grocery rhythm</h2>
            </div>
            <span className="rounded-full bg-market-banner px-3 py-1 text-xs font-bold text-market-green-dark">
              1 month free
            </span>
          </div>
          {plans.length ? (
            <div className="mt-5 grid gap-3" role="radiogroup" aria-label="Weekly plans">
              {plans.map((plan) => {
                const selected = selectedPlanId === plan.id;
                return (
                  <button
                    aria-checked={selected}
                    className={`grid gap-2 border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep ${selected ? "border-market-green bg-market-banner/40" : "border-line hover:border-market-green"}`}
                    disabled={pending}
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    role="radio"
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-4">
                      <strong className="text-base text-ink">{plan.name}</strong>
                      <span className="text-sm font-bold text-market-green-dark">
                        {formatPhp(plan.weeklyFee.centavos)} / week
                      </span>
                    </span>
                    <span className="text-sm leading-5 text-muted">
                      Includes {formatPhp(plan.weeklyCredit.centavos)} in weekly grocery credit.
                    </span>
                  </button>
                );
              })}
              <Button
                className="mt-2 w-full"
                disabled={!selectedPlanId}
                loading={pending}
                onClick={() => void activate()}
              >
                Activate plan and continue
              </Button>
              {message ? (
                <p className="text-sm text-danger" role="alert">
                  {message}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted" role="status">
              Weekly plans are temporarily unavailable. Please return to shopping and try again
              later.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Benefit({
  icon,
  title,
  copy,
}: Readonly<{ icon: ReactNode; title: string; copy: string }>) {
  return (
    <div className="grid gap-2">
      <span className="grid size-8 place-items-center rounded-full bg-accent text-deep">
        {icon}
      </span>
      <strong className="text-sm text-ink">{title}</strong>
      <span className="text-xs leading-5 text-muted">{copy}</span>
    </div>
  );
}

function formatPhp(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}
