export type KellyFixtureScenario = {
  scenario: string;
  pop: number;
  rMultiple: number;
  expectedKellyPercent: string;
  notes: string;
};

export const kellySizingFixtureScenarios: KellyFixtureScenario[] = [
  {
    scenario: "Baseline",
    pop: 0.5,
    rMultiple: 1,
    expectedKellyPercent: "0%",
    notes: "Edge case — no edge",
  },
  {
    scenario: "Zero probability",
    pop: 0,
    rMultiple: 1,
    expectedKellyPercent: "0%",
    notes: "Must not produce a bet",
  },
  {
    scenario: "Full probability",
    pop: 1,
    rMultiple: 1,
    expectedKellyPercent: "capped",
    notes: "Must not produce infinite sizing",
  },
  {
    scenario: "Typical put credit spread",
    pop: 0.68,
    rMultiple: 0.4,
    expectedKellyPercent: "calculated",
    notes: "Core use case",
  },
  {
    scenario: "Extreme R/R",
    pop: 0.3,
    rMultiple: 3,
    expectedKellyPercent: "calculated",
    notes: "Stress test",
  },
];
