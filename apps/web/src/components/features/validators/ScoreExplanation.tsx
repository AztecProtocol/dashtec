import React from 'react';

export const ScoreExplanation: React.FC = () => (
  <div className="text-left">
    <h4 className="font-bold text-sm mb-1 text-slate-100">Ranking Score Calculation</h4>
    <p className="mb-1">
      Sequencers are ranked based on a weighted score (0-1) that considers the following metrics from the selected timeframe:
    </p>
    <ul className="list-disc list-inside space-y-1">
      <li><strong>Attestation Success Rate (35%)</strong> - successful attestations / total attestations</li>
      <li><strong>Attestation Volume (25%)</strong> - total attestations relative to network max</li>
      <li><strong>Proposal Rate (20%)</strong> - (checkpoint proposed + mined) / (proposed + mined + checkpoint missed + block missed)</li>
      <li><strong>Proposal Volume (20%)</strong> - total proposal opportunities relative to network max</li>
    </ul>
  </div>
);