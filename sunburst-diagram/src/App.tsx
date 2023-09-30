import { useEffect, useRef } from "react";
import { createIcicle } from "./createIcicle";
import { createSunburst } from "./createSunburst";
import flareTree from "./flare-tree.json";

export const App = () => {
  return (
    <div style={{ display: "grid", padding: 10, gap: 10 }}>
      <Chart
        svg={() =>
          createIcicle(flareTree, {
            width: 600,
            height: 600,
            value: (d: any) => d.size,
            label: (d: any) => d.name,
          } as any)
        }
      />
      <Chart
        svg={() =>
          createSunburst(flareTree, {
            width: 600,
            height: 600,
            value: (d: any) => d.size,
            label: (d: any) => d.name,
          } as any)
        }
      />
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
