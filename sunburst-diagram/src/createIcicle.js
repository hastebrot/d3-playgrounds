import * as d3 from "d3";

// Copyright 2021-2023 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/icicle
export function createIcicle(
  data,
  {
    // data is either tabular (array of objects) or hierarchy (nested objects)
    dataPath, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
    dataId = Array.isArray(data) ? (d) => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
    dataParentId = Array.isArray(data) ? (d) => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
    dataChildren, // if hierarchical data, given a d in data, returns its children
    formatValue = ",", // format specifier string or function for values
    value, // given a node d, returns a quantitative value (for area encoding; null for count)
    sort = (a, b) => d3.descending(a.value, b.value), // how to sort nodes prior to layout
    label, // given a node d, returns the name to display on the rectangle
    title, // given a node d, returns its hover text
    link, // given a node d, its link (if any)
    linkTarget = "_blank", // the target attribute for links (if any)
    width = 640, // outer width, in pixels
    height = 400, // outer height, in pixels
    padding = 0, // cell padding, in pixels
    color = d3.interpolateRainbow, // color scheme, if any
    fill = "#ccc", // fill for node rects (if no color encoding)
    fillOpacity = 0.6, // fill opacity for node rects
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

  // Compute formats.
  if (typeof formatValue !== "function") formatValue = d3.format(formatValue);

  // Sort the leaves (typically by descending value for a pleasing layout).
  if (sort != null) root.sort(sort);

  // Compute the partition layout. Note that x and y are swapped!
  const countLevel = 4;
  const layout = d3
    .partition()
    .size([height, ((root.height + 1) * width) / countLevel])
    .padding(padding)
    .round(true);
  layout(root);

  // Construct a color scale.
  if (color != null) {
    color = d3.scaleSequential([0, root.children.length - 1], color).unknown(fill);
    root.children.forEach((child, i) => (child.index = i));
  }

  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
    .attr("font-family", "sans-serif")
    .attr("font-size", 10);

  const cell = svg
    .selectAll("a")
    .data(root.descendants())
    .join("a")
    .attr("xlink:href", link == null ? null : (d) => link(d.data, d))
    .attr("target", link == null ? null : linkTarget)
    .attr("transform", (d) => `translate(${d.y0},${d.x0})`);

  const rectFill = (d) => {
    const c = color(d.ancestors().reverse()[1]?.index);
    if (d.depth >= 2) {
      return d3.color(c).darker();
    }
    return c;
  };

  const rect = cell
    .append("rect")
    .attr("width", (d) => d.y1 - d.y0)
    .attr("height", (d) => d.x1 - d.x0)
    .attr("fill", color ? (d) => rectFill(d) : fill)
    .attr("fill-opacity", fillOpacity);

  const text = cell
    .filter((d) => d.x1 - d.x0 > 10)
    .append("text")
    .attr("x", 4)
    .attr("y", (d) => Math.min(9, (d.x1 - d.x0) / 2))
    .attr("dy", "0.32em");

  if (label != null) {
    text.append("tspan").text((d) => label(d.data, d));
  }

  text
    .append("tspan")
    .attr("fill-opacity", 0.7)
    .attr("dx", label == null ? null : 3)
    .text((d) => formatValue(d.value));

  if (title != null) {
    cell.append("title").text((d) => title(d.data, d));
  }

  return svg.node();
}
