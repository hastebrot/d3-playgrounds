import * as d3 from "d3";
import { useEffect, useRef } from "react";

export const App = () => {
  const data = [{ label: "label" }];
  const width = 200;
  const height = 200;

  const createSvg = () => {
    const svg = d3
      .create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height)
      .attr("style", "font: 12px sans-serif;");

    const group = svg.selectAll("g").data(data).join("g");
    group
      .append("text")
      .attr("y", 12)
      .text((d) => d.label);

    return svg.node();
  };

  return (
    <div style={{ padding: 10 }}>
      <Chart svg={createSvg} />
    </div>
  );
};

type ChartProps = {
  svg: () => SVGSVGElement | null;
};

const Chart = (props: ChartProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const div = ref.current;
    const svg = props.svg();

    // replace svg child in div parent. works with react hot reloading.
    if (svg) {
      div?.replaceChildren(svg);
    } else {
      div?.replaceChildren();
    }
  }, []);

  return <div ref={ref}></div>;
};
