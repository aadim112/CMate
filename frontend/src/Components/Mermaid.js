// components/Mermaid.js
import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false });

function Mermaid({ chart }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      try {
        mermaid.contentLoaded();
        mermaid.render(`mermaid-${Date.now()}`, chart, (svgCode) => {
          ref.current.innerHTML = svgCode;
        });
      } catch (err) {
        ref.current.innerHTML = "Error rendering Mermaid diagram.";
      }
    }
  }, [chart]);

  return <div ref={ref} />;
}

export default Mermaid;
