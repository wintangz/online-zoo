import React, { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import {
  ANIMAL_SPECIES_CATALOG,
  ANIMAL_SPECIES_IDS,
  gameStore,
  type AnimalSpeciesId,
  type HabitatId
} from '@online-zoo/game-core';

function triggerHabitatFeedingFromUI(habitatId: HabitatId): void {
  if (typeof window !== 'undefined') {
    const rt = (window as unknown as {
      __ONLINE_ZOO_RUNTIME__?: {
        multiplayerClient?: {
          sendTriggerAnimalFeeding: (hid: HabitatId) => void;
        };
      };
    }).__ONLINE_ZOO_RUNTIME__;
    if (rt?.multiplayerClient) {
      rt.multiplayerClient.sendTriggerAnimalFeeding(habitatId);
      return;
    }
  }
}

export const AnimalSimulationOverlay: React.FC = () => {
  const phase = useStore(gameStore, (s) => s.phase);
  const animals = useStore(gameStore, (s) => s.animalSim.animals);
  const habitatFeedings = useStore(gameStore, (s) => s.animalSim.habitatFeedings);
  const inspectedAnimalId = useStore(gameStore, (s) => s.animalSim.inspectedAnimalId);
  const isEncyclopediaOpen = useStore(gameStore, (s) => s.animalSim.isEncyclopediaOpen);
  const encyclopedia = useStore(gameStore, (s) => s.animalSim.encyclopedia);
  const discoveryToast = useStore(gameStore, (s) => s.animalSim.discoveryToast);
  const feedingNotice = useStore(gameStore, (s) => s.animalSim.feedingNotice);

  const inspectAnimal = useStore(gameStore, (s) => s.inspectAnimal);
  const setEncyclopediaOpen = useStore(gameStore, (s) => s.setEncyclopediaOpen);
  const clearDiscoveryToast = useStore(gameStore, (s) => s.clearDiscoveryToast);
  const setFeedingNotice = useStore(gameStore, (s) => s.setFeedingNotice);

  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!discoveryToast) return;
    const t = setTimeout(() => {
      clearDiscoveryToast();
    }, 5000);
    return () => clearTimeout(t);
  }, [discoveryToast, clearDiscoveryToast]);

  if (phase !== 'playing') {
    return null;
  }

  const inspectedAnimal = inspectedAnimalId
    ? animals.find((a) => a.animalId === inspectedAnimalId) ?? null
    : null;
  const inspectedSpecies = inspectedAnimal
    ? ANIMAL_SPECIES_CATALOG[inspectedAnimal.speciesId]
    : null;
  const inspectedFeeding = inspectedAnimal
    ? habitatFeedings[inspectedAnimal.habitatId]
    : null;

  const discoveredCount = ANIMAL_SPECIES_IDS.filter(
    (sid) => encyclopedia.entries[sid].discovered
  ).length;

  const computeFeedingStatusLabel = () => {
    if (!inspectedFeeding || !inspectedSpecies) return 'Ready to Feed';
    if (inspectedFeeding.isActive && inspectedFeeding.endsAt && inspectedFeeding.endsAt > nowMs) {
      const remSec = Math.max(1, Math.ceil((inspectedFeeding.endsAt - nowMs) / 1000));
      return `Feeding Active (${remSec}s left) — ${inspectedSpecies.feedingActivityName}`;
    }
    if (
      inspectedFeeding.cooldownUntil &&
      inspectedFeeding.cooldownUntil > nowMs
    ) {
      const cdSec = Math.max(1, Math.ceil((inspectedFeeding.cooldownUntil - nowMs) / 1000));
      return `On Cooldown (${cdSec}s remaining)`;
    }
    return `Ready — ${inspectedSpecies.feedingActivityName}`;
  };

  return (
    <>
      {/* Live Habitat Animal Status Strip (allows quick observation & inspection on desktop and mobile) */}
      <div
        data-testid="animal-status-strip"
        className="pointer-events-auto fixed left-4 top-44 z-20 flex max-w-[92vw] flex-wrap items-center gap-1.5 rounded-2xl border border-white/15 bg-slate-950/75 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur-md sm:left-6"
      >
        <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
          Habitats:
        </span>
        {animals.map((animal) => {
          const cat = ANIMAL_SPECIES_CATALOG[animal.speciesId];
          const isSelected = inspectedAnimalId === animal.animalId;
          return (
            <button
              key={animal.animalId}
              type="button"
              data-testid={`animal-badge-${animal.animalId}`}
              onClick={(e) => {
                e.currentTarget.blur();
                inspectAnimal(animal.animalId);
              }}
              className={`inline-flex items-center gap-1 rounded-xl border px-2 py-0.5 text-[11px] font-semibold transition ${
                isSelected
                  ? 'border-emerald-300 bg-emerald-500/30 text-white'
                  : 'border-white/15 bg-white/10 text-slate-100 hover:bg-white/20'
              }`}
            >
              <span>{cat.badgeIcon}</span>
              <span>{animal.displayName}</span>
              <span
                data-testid={`animal-state-${animal.animalId}`}
                className="rounded bg-black/40 px-1.5 py-0.2 text-[10px] font-bold text-emerald-300"
              >
                {animal.behaviorState}
              </span>
            </button>
          );
        })}
      </div>

      {/* Discovery Notification Toast (FR-009, US4) */}
      {discoveryToast && (
        <div
          data-testid="animal-discovery-toast"
          className="pointer-events-auto fixed left-1/2 top-28 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-300/60 bg-emerald-950/95 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl backdrop-blur-md"
        >
          <span className="text-lg">
            {ANIMAL_SPECIES_CATALOG[discoveryToast.speciesId].badgeIcon}
          </span>
          <div>
            <div className="font-bold text-amber-300">New Species Discovered!</div>
            <div className="text-emerald-100">
              {discoveryToast.commonName} added to your Animal Encyclopedia ({discoveredCount}/3).
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearDiscoveryToast();
              setEncyclopediaOpen(true);
            }}
            className="rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-emerald-950 hover:bg-amber-300"
          >
            View Encyclopedia
          </button>
        </div>
      )}

      {/* Animal Information Inspection Panel (FR-006..FR-008, US3 & US5) */}
      {inspectedAnimal && inspectedSpecies && (
        <div
          data-testid="animal-info-panel"
          className="pointer-events-auto fixed right-4 top-24 z-40 flex max-h-[80vh] w-[92vw] max-w-md flex-col overflow-y-auto rounded-3xl border border-emerald-300/35 bg-slate-950/95 p-5 text-white shadow-2xl backdrop-blur-xl sm:right-6"
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/15 pb-3">
            <div className="flex items-center gap-2.5">
              <span className=" flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-2xl">
                {inspectedSpecies.badgeIcon}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    data-testid="animal-info-common-name"
                    className="text-base font-extrabold leading-tight text-white"
                  >
                    {inspectedSpecies.commonName}
                  </h2>
                  <span
                    data-testid="animal-info-individual-name"
                    className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold text-emerald-200"
                  >
                    {inspectedAnimal.displayName}
                  </span>
                </div>
                <p className="text-xs italic text-slate-300">
                  {inspectedSpecies.scientificName} • {inspectedSpecies.conservationStatus}
                </p>
              </div>
            </div>
            <button
              type="button"
              data-testid="close-animal-info-btn"
              onClick={() => inspectAnimal(null)}
              className="rounded-xl border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-white/20"
            >
              Close
            </button>
          </div>

          {/* Live Behavior Badge */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2">
            <span className="text-xs font-medium text-slate-300">Current Observed Behavior:</span>
            <span
              data-testid="animal-info-behavior-badge"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 px-3 py-0.5 text-xs font-bold text-emerald-200"
            >
              <span>{inspectedAnimal.behaviorState}</span>
              <span className="text-[11px] font-normal text-emerald-300/90">
                ({inspectedAnimal.activityVariant})
              </span>
            </span>
          </div>

          {/* Habitat & Diet */}
          <div className="mt-3 space-y-2 text-xs leading-relaxed">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="font-bold uppercase tracking-wider text-emerald-300">
                Habitat & Enclosure
              </div>
              <div data-testid="animal-info-habitat" className="mt-0.5 text-slate-100">
                {inspectedSpecies.habitatName} — {inspectedSpecies.summary}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="font-bold uppercase tracking-wider text-amber-300">Natural Diet</div>
              <div data-testid="animal-info-diet" className="mt-0.5 text-slate-100">
                {inspectedSpecies.diet}
              </div>
            </div>
          </div>

          {/* Educational Facts */}
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs font-bold uppercase tracking-wider text-sky-300">
              Field Guide Facts
            </div>
            <ul
              data-testid="animal-info-facts"
              className="mt-1.5 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-200"
            >
              {inspectedSpecies.facts.map((fact, idx) => (
                <li key={idx}>{fact}</li>
              ))}
            </ul>
          </div>

          {/* Interactive Habitat Feeding Activity Section (US5, FR-013..FR-015) */}
          <div className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-500/10 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-amber-200">
                  {inspectedSpecies.feedingActivityName}
                </div>
                <div
                  data-testid="animal-feeding-status"
                  className="mt-0.5 text-[11px] font-medium text-amber-100/90"
                >
                  {computeFeedingStatusLabel()}
                </div>
              </div>
              <button
                type="button"
                data-testid="animal-trigger-feeding-button"
                onClick={() => triggerHabitatFeedingFromUI(inspectedAnimal.habitatId)}
                className="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow transition hover:bg-amber-300 active:scale-95"
              >
                Feed {inspectedSpecies.feedingFoodLabel}
              </button>
            </div>
            {feedingNotice && (
              <div
                data-testid="animal-feeding-notice"
                className="mt-2 flex items-center justify-between rounded-xl bg-black/40 px-3 py-1.5 text-[11px] font-semibold text-amber-200"
              >
                <span>{feedingNotice}</span>
                <button
                  type="button"
                  onClick={() => setFeedingNotice(null)}
                  className="ml-2 text-[10px] text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Animal Encyclopedia Collection Modal (FR-009..FR-012, US4) */}
      {isEncyclopediaOpen && (
        <div
          data-testid="animal-encyclopedia-modal"
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
        >
          <div className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-emerald-300/35 bg-slate-950/95 p-5 text-white shadow-2xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-4">
              <div>
                <h2 className="text-lg font-extrabold tracking-wide text-white">
                  Zoo Animal Encyclopedia
                </h2>
                <p className="text-xs text-slate-300">
                  Approach animals in their habitats or inspect them to unlock field guide entries.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  data-testid="encyclopedia-progress-badge"
                  className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-200"
                >
                  {discoveredCount} / {ANIMAL_SPECIES_IDS.length} Species Discovered
                </span>
                <button
                  type="button"
                  data-testid="close-encyclopedia-btn"
                  onClick={() => setEncyclopediaOpen(false)}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/20"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-4 grid flex-1 gap-3.5 overflow-y-auto pr-1 sm:grid-cols-1">
              {ANIMAL_SPECIES_IDS.map((speciesId: AnimalSpeciesId) => {
                const record = encyclopedia.entries[speciesId];
                const species = ANIMAL_SPECIES_CATALOG[speciesId];
                const representativeAnimal = animals.find((a) => a.speciesId === speciesId);

                return (
                  <div
                    key={speciesId}
                    data-testid={`encyclopedia-entry-${speciesId}`}
                    className={`rounded-2xl border p-4 transition ${
                      record.discovered
                        ? 'border-emerald-400/35 bg-emerald-950/35'
                        : 'border-white/10 bg-white/5 opacity-85'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                          {record.discovered ? species.badgeIcon : '❓'}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-extrabold text-white">
                              {record.discovered ? species.commonName : 'Undiscovered Species'}
                            </h3>
                            <span
                              data-testid={`encyclopedia-status-${speciesId}`}
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                record.discovered
                                  ? 'bg-emerald-500/25 text-emerald-200'
                                  : 'bg-slate-700/70 text-slate-300'
                              }`}
                            >
                              {record.discovered ? 'Discovered' : 'Undiscovered'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            {record.discovered
                              ? `${species.scientificName} • ${species.habitatName}`
                              : `Location Hint: ${species.discoveryHint}`}
                          </p>
                        </div>
                      </div>

                      {record.discovered && representativeAnimal && (
                        <button
                          type="button"
                          data-testid={`encyclopedia-inspect-${speciesId}`}
                          onClick={() => {
                            setEncyclopediaOpen(false);
                            inspectAnimal(representativeAnimal.animalId);
                          }}
                          className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                        >
                          Inspect {representativeAnimal.displayName}
                        </button>
                      )}
                    </div>

                    {record.discovered ? (
                      <div className="mt-3 space-y-2 border-t border-white/10 pt-2.5 text-xs text-slate-200">
                        <div>
                          <span className="font-bold text-amber-300">Diet: </span>
                          <span>{species.diet}</span>
                        </div>
                        <ul className="list-disc space-y-1 pl-4 text-slate-300">
                          {species.facts.slice(0, 2).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="mt-2.5 text-xs italic text-slate-400">
                        Walk closer to this habitat in the zoo to observe and unlock this species!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

