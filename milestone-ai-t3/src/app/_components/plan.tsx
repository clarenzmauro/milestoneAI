"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function LatestPlan() {
  const [plans] = api.plan.getAll.useSuspenseQuery();
  const latestPlan = plans[0];

  const utils = api.useUtils();
  const [goal, setGoal] = useState("");
  const createPlan = api.plan.create.useMutation({
    onSuccess: async () => {
      await utils.plan.invalidate();
      setGoal("");
    },
  });

  return (
    <div className="w-full max-w-xs">
      {latestPlan ? (
        <p className="truncate">Your most recent plan: {latestPlan.goal}</p>
      ) : (
        <p>You have no plans yet.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createPlan.mutate({ goal });
        }}
        className="flex flex-col gap-2"
      >
        <input
          type="text"
          placeholder="Plan goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="w-full rounded-full bg-white/10 px-4 py-2 text-white"
        />
        <button
          type="submit"
          className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
          disabled={createPlan.isPending}
        >
          {createPlan.isPending ? "Creating..." : "Create Plan"}
        </button>
      </form>
    </div>
  );
}
