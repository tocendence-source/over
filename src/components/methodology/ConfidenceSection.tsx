import { useState } from "react";
import { confidenceTiers } from "@/data/methodology";

const points = [[37, 14], [62, 20], [76, 42], [62, 66], [35, 75], [14, 58], [10, 33], [43, 43]];
const pairs = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 7], [3, 7], [5, 7]];

export function ConfidenceSection() {
  const [selected, setSelected] = useState(2);
  const tier = confidenceTiers[selected];
  return <div className="confidence" aria-labelledby="confidence-heading">
    <div><h3 id="confidence-heading">How confidence is recorded.</h3><p>Not every connection is equally reliable. These labels describe the strength of the supporting evidence, not a calculated probability.</p></div>
    <div>
      <div className="confidence-options" aria-label="Confidence states">
        {confidenceTiers.map((item, index) => <button key={item.id} type="button" className="confidence-option" aria-pressed={index === selected} aria-controls="confidence-description" onClick={() => setSelected(index)}>{item.label}</button>)}
      </div>
      <div className="confidence-detail" id="confidence-description" aria-live="polite">
        <svg viewBox="0 0 88 88" fill="none" aria-hidden="true">
          <circle cx="44" cy="44" r="41" stroke="#9d9f8c" strokeWidth=".4" />
          {pairs.slice(0, tier.links).map(([a, b], i) => <line key={i} x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} stroke="#7c704c" strokeWidth=".7" />)}
          {points.slice(0, tier.nodes).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={selected === 3 ? 3 : 2} fill="#68724d" />)}
        </svg>
        <div><strong>{tier.criteria}</strong><p>{tier.copy}</p></div>
      </div>
    </div>
  </div>;
}