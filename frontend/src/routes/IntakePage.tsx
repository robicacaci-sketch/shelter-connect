import React from "react";
import IntakeForm from "../components/IntakeForm";

const IntakePage: React.FC = () => {
  return (
    <main className="page" role="main">
      <section className="page__header">
        <h1>New individual intake</h1>
        <p className="page__subtitle">
          Capture key information to generate a tailored housing readiness
          roadmap.
        </p>
      </section>

      <IntakeForm />
    </main>
  );
};

export default IntakePage;

