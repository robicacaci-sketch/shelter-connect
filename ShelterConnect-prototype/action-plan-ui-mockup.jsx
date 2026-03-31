import { useState } from "react";

const planData = {
  resident: "Maria D.",
  finalGoal: "Obtain emergency shelter placement through the City Housing Authority Program",
  summary:
    "Based on Maria's intake data, she qualifies for emergency shelter as an undocumented resident with a minor child. This plan focuses on securing her immigration status documentation first, which is the gateway requirement for all city-funded shelter programs.",
  steps: [
    {
      step_number: 1,
      action: "Call the Immigration Legal Help Line",
      phone: "1-800-555-0192",
      what_to_ask_for:
        "Ask for a free consultation to determine eligibility for Temporary Protected Status (TPS) or U-Visa",
      goal_of_this_step: "Obtain a written immigration status determination letter",
      why_it_matters:
        "The City Housing Authority requires proof of legal presence or pending status before processing any shelter application. This letter is the key that unlocks every next step.",
      expected_outcome:
        "A scheduled appointment within 5–7 business days and a case reference number",
    },
    {
      step_number: 2,
      action: "Visit the Department of Social Services — Office 3B",
      address: "123 Main St, Newark NJ — bring the letter from Step 1",
      what_to_ask_for:
        "Request an emergency family shelter application (Form ESA-12) and ask about the Family Reunification Unit",
      goal_of_this_step:
        "Submit the official shelter application and get a case number assigned",
      why_it_matters:
        "Without a submitted application and case number, Maria cannot be placed in the emergency queue. The case number is what the shelter manager tracks for placement updates.",
      expected_outcome:
        "Completed Form ESA-12 with a case number and a follow-up appointment date",
    },
    {
      step_number: 3,
      action: "Contact the Child Services Coordination Unit",
      phone: "1-800-555-0340",
      what_to_ask_for:
        "Request that Maria's minor child is registered as a dependent on the shelter case, and ask about the family priority queue",
      goal_of_this_step:
        "Ensure the child's presence is formally registered, activating family priority placement status",
      why_it_matters:
        "Families with minor children are placed in a priority queue, which can reduce the wait time from weeks to days. This step directly accelerates the final placement.",
      expected_outcome:
        "Confirmation that the child is linked to the case and family priority status is active",
    },
  ],
};

function StepCard({ step, isOpen, onToggle }) {
  return (
    <div
      className="rounded-xl border border-gray-200 overflow-hidden mb-4 shadow-sm"
      style={{ background: "#fff" }}
    >
      {/* Step Header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-4 flex items-center gap-4"
        style={{ background: isOpen ? "#f0f7ff" : "#fff" }}
      >
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ background: "#2563eb" }}
        >
          {step.step_number}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800 text-base">{step.action}</p>
          {step.phone && (
            <p className="text-sm text-blue-600 mt-0.5">{step.phone}</p>
          )}
          {step.address && (
            <p className="text-sm text-blue-600 mt-0.5">{step.address}</p>
          )}
        </div>
        <span className="text-gray-400 text-xl">{isOpen ? "▲" : "▼"}</span>
      </button>

      {/* Step Detail */}
      {isOpen && (
        <div className="px-6 py-5 border-t border-gray-100 grid gap-4">
          {/* What to ask for */}
          <div className="flex gap-3">
            <span className="text-blue-500 text-lg mt-0.5">💬</span>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                What to ask for
              </p>
              <p className="text-gray-700 text-sm">{step.what_to_ask_for}</p>
            </div>
          </div>

          {/* Goal of this step */}
          <div className="flex gap-3">
            <span className="text-green-500 text-lg mt-0.5">🎯</span>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Goal of this step
              </p>
              <p className="text-gray-700 text-sm">{step.goal_of_this_step}</p>
            </div>
          </div>

          {/* Why it matters */}
          <div
            className="flex gap-3 rounded-lg px-4 py-3"
            style={{ background: "#fffbeb" }}
          >
            <span className="text-yellow-500 text-lg mt-0.5">🔗</span>
            <div>
              <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">
                Why it matters for your case
              </p>
              <p className="text-gray-700 text-sm">{step.why_it_matters}</p>
            </div>
          </div>

          {/* Expected outcome */}
          <div className="flex gap-3">
            <span className="text-purple-500 text-lg mt-0.5">✅</span>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Expected outcome
              </p>
              <p className="text-gray-700 text-sm">{step.expected_outcome}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActionPlan() {
  const [openStep, setOpenStep] = useState(1);

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "#f8fafc" }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">
            Action Plan for
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            {planData.resident}
          </h1>
        </div>

        {/* Final Goal Banner */}
        <div
          className="rounded-xl px-6 py-4 mb-6 flex gap-3 items-start"
          style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe" }}
        >
          <span className="text-blue-500 text-xl mt-0.5">🏁</span>
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
              Final Goal
            </p>
            <p className="text-gray-800 font-medium text-sm">
              {planData.finalGoal}
            </p>
          </div>
        </div>

        {/* Why this plan */}
        <div
          className="rounded-xl px-6 py-4 mb-8"
          style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0" }}
        >
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
            Why this plan works for your situation
          </p>
          <p className="text-gray-700 text-sm">{planData.summary}</p>
        </div>

        {/* Steps */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Your Steps — {planData.steps.length} total
          </p>
          {planData.steps.map((step) => (
            <StepCard
              key={step.step_number}
              step={step}
              isOpen={openStep === step.step_number}
              onToggle={() =>
                setOpenStep(openStep === step.step_number ? null : step.step_number)
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
