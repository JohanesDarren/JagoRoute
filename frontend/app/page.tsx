import { Cpu, Waypoints, KeyRound, ArrowRight, ArrowDown } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-container-lowest px-4">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-on-surface sm:text-5xl">
          JagoRoute
        </h1>
        <p className="mt-3 text-lg text-on-surface-variant">
          IoT Hardware API Aggregator — one URL, one key, all your devices.
        </p>
      </div>

      {/* How It Works */}
      <div className="mb-10 w-full max-w-3xl">
        <h2 className="mb-6 text-center text-sm font-bold uppercase tracking-[0.12em] text-on-surface-variant">
          How It Works
        </h2>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-0">
          {/* Step 1 */}
          <div className="flex w-full flex-col items-center gap-3 rounded-lg border border-outline-variant bg-surface-container p-5 text-center sm:w-1/3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container/20 text-primary">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-on-surface">Register Hardware</h3>
            <p className="text-xs text-on-surface-variant">
              ESP32, RPi, Camera, Ecowitt, BMKG — any HTTP API. Store credentials once.
            </p>
          </div>

          {/* Arrow between steps on desktop */}
          <div className="hidden sm:flex sm:items-center sm:justify-center sm:px-1 sm:pt-8">
            <ArrowRight className="h-5 w-5 text-outline" />
          </div>
          <div className="flex sm:hidden">
            <ArrowDown className="h-5 w-5 text-outline" />
          </div>

          {/* Step 2 */}
          <div className="flex w-full flex-col items-center gap-3 rounded-lg border border-outline-variant bg-surface-container p-5 text-center sm:w-1/3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/20 text-secondary">
              <Waypoints className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-on-surface">Group into Routes</h3>
            <p className="text-xs text-on-surface-variant">
              One call fans out to all devices. Aggregator mode merges responses into one payload.
            </p>
          </div>

          {/* Arrow between steps on desktop */}
          <div className="hidden sm:flex sm:items-center sm:justify-center sm:px-1 sm:pt-8">
            <ArrowRight className="h-5 w-5 text-outline" />
          </div>
          <div className="flex sm:hidden">
            <ArrowDown className="h-5 w-5 text-outline" />
          </div>

          {/* Step 3 */}
          <div className="flex w-full flex-col items-center gap-3 rounded-lg border border-outline-variant bg-surface-container p-5 text-center sm:w-1/3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tertiary-container/20 text-tertiary">
              <KeyRound className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-on-surface">Share .env Key</h3>
            <p className="text-xs text-on-surface-variant">
              One URL, one API key. The software team drops it in .env and never sees device credentials.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <Link href="/login" className="btn-primary px-6 py-2.5 text-sm font-semibold">
          Sign in
        </Link>
        <Link href="/dashboard" className="btn-secondary px-6 py-2.5 text-sm font-semibold">
          Dashboard
        </Link>
      </div>
    </div>
  );
}