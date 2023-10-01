import * as d3 from "d3";

// Copyright 2021-2023 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/sunburst
export function createSunburst(
  data,
  {
    // data is either tabular (array of objects) or hierarchy (nested objects)
    dataPath, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
    dataId = Array.isArray(data) ? (d) => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
    dataParentId = Array.isArray(data) ? (d) => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
    dataChildren, // if hierarchical data, given a d in data, returns its children
    value, // given a node d, returns a quantitative value (for area encoding; null for count)
    sort = (a, b) => d3.descending(a.value, b.value), // how to sort nodes prior to layout
    label, // given a node d, returns the name to display on the rectangle
    title, // given a node d, returns its hover text
    link, // given a node d, its link (if any)
    linkTarget = "_blank", // the target attribute for links (if any)
    width = 640, // outer width, in pixels
    height = 400, // outer height, in pixels
    padding = 0, // separation between arcs
    startAngle = 0, // the starting angle for the sunburst
    endAngle = 2 * Math.PI, // the ending angle for the sunburst
    radius = Math.min(width, height) / 2, // outer radius
    color = d3.interpolateRainbow, // color scheme, if any
    fill = "#ccc", // fill for arcs (if no color encoding)
    fillOpacity = 0.6, // fill opacity for arcs
  } = {}
) {
  // If id and parentId options are specified, or the path option, use d3.stratify
  // to convert tabular data to a hierarchy; otherwise we assume that the data is
  // specified as an object {children} with nested objects (a.k.a. the “flare.json”
  // format), and use d3.hierarchy.
  const root =
    dataPath != null
      ? d3.stratify().path(dataPath)(data)
      : dataId != null || dataParentId != null
      ? d3.stratify().id(dataId).parentId(dataParentId)(data)
      : d3.hierarchy(data, dataChildren);

  // Compute the values of internal nodes by aggregating from the leaves.
  value == null ? root.count() : root.sum((d) => Math.max(0, value(d)));

  // Sort the leaves (typically by descending value for a pleasing layout).
  if (sort != null) root.sort(sort);

  const countLevel = 4;
  radius = radius / countLevel;

  // Compute the partition layout. Note polar coordinates: x is angle and y is radius.
  const layout = d3
    .partition()
    .size([endAngle - startAngle, root.height + 1])
    .round(false);
  layout(root);

  // Construct a color scale.
  if (color != null) {
    color = d3.scaleSequential([0, root.children.length], color).unknown(fill);
    root.children.forEach((child, i) => (child.index = i));
  }

  // Construct an arc generator.
  const arc = d3
    .arc()
    .startAngle((d) => d.x0 + startAngle)
    .endAngle((d) => d.x1 + startAngle)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2))
    .padRadius(padding * radius)
    .innerRadius((d) => d.y0 * radius)
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - padding));

  const svg = d3
    .create("svg")
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10)
    .attr("text-anchor", "middle");

  const cell = svg
    .selectAll("a")
    .data(root.descendants())
    .join("a")
    .attr("xlink:href", link == null ? null : (d) => link(d.data, d))
    .attr("target", link == null ? null : linkTarget);

  const pathFill = (d) => {
    const c = color(d.ancestors().reverse()[1]?.index);
    if (d.depth >= 2) {
      return d3.color(c).darker();
    }
    return c;
  };

  const path = cell
    .append("path")
    .attr("d", (d) => arc(d))
    .attr("fill", color ? (d) => pathFill(d) : fill)
    .attr("fill-opacity", (d) => (d.depth < countLevel ? fillOpacity : 0));

  const labelTransform = (d) => {
    if (!d.depth) return;
    const x = (((d.x0 + d.x1) / 2 + startAngle) * 180) / Math.PI;
    const y = ((d.y0 + d.y1) / 2) * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  };

  const labelVisible = (d) => {
    if (!(d.depth < countLevel)) return;
    return (((d.y0 + d.y1) * radius) / 2) * (d.x1 - d.x0) > 10;
  };

  if (label != null) {
    cell
      .filter((d) => labelVisible(d))
      .append("text")
      .attr("transform", (d) => labelTransform(d))
      .attr("dy", "0.32em")
      .text((d) => label(d.data, d));
  }

  if (title != null) {
    cell.append("title").text((d) => title(d.data, d));
  }

  return svg.node();
}
