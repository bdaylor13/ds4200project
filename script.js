// D3 Script for Airbnb Scatterplot + Boxplots

// SVG Sizes and Margins (improved for label alignment)
const scatterMargin = { top: 50, right: 50, bottom: 70, left: 70 };
const scatterWidth = 900;
const scatterHeight = 500;

const boxMargin = { top: 50, right: 50, bottom: 90, left: 70 };
const boxWidth = 900;
const boxHeight = 420; // Increased to avoid cut-off labels

// Tooltip
const tooltip = d3.select("#tooltip");

// Load CSV
Promise.all([
  d3.csv("cleaned_listings.csv", d3.autoType)
]).then(([data]) => {

  // ==============================
  // SCATTERPLOT CANVAS
  // ==============================
  const scatterSvg = d3.select("#scatter")
    .append("svg")
    .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
    .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
    .append("g")
    .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

  // Scales
  const xScatter = d3.scaleLinear()
    .domain(d3.extent(data, d => d.calculated_host_listings_count))
    .range([0, scatterWidth]);

  const yScatter = d3.scaleLinear()
    .domain(d3.extent(data, d => d.review_scores_rating))
    .range([scatterHeight, 0]);

  const sizeScatter = d3.scaleSqrt()
    .domain([0, d3.max(data, d => d.estimated_revenue_l365d)])
    .range([2, 18]);

  const colorScatter = d3.scaleOrdinal()
    .domain(["t", "f"])
    .range(["#f5a623", "#4f81bd"]);

  // Axes
  scatterSvg.append("g")
    .attr("transform", `translate(0,${scatterHeight})`)
    .call(d3.axisBottom(xScatter));

  scatterSvg.append("g")
    .call(d3.axisLeft(yScatter));

  // Axis Labels
  scatterSvg.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 50)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .text("Host Total Listings Count");

  scatterSvg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -scatterHeight / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .text("Average Review Score Rating");

  // Points
  scatterSvg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => xScatter(d.calculated_host_listings_count))
    .attr("cy", d => yScatter(d.review_scores_rating))
    .attr("r", d => sizeScatter(d.estimated_revenue_l365d))
    .attr("fill", d => colorScatter(d.host_is_superhost))
    .attr("opacity", 0.75)
    .on("mouseover", (event, d) => {
      tooltip.style("display", "block")
        .html(`Host Listings: ${d.calculated_host_listings_count}<br>
               Rating: ${d.review_scores_rating}<br>
               Revenue (365d): $${d.estimated_revenue_l365d}<br>
               Superhost: ${d.host_is_superhost}`)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY + "px");
    })
    .on("mouseout", () => tooltip.style("display", "none"));

  // Legend
  const legend = scatterSvg.append("g")
    .attr("transform", "translate(20, -20)");

  ["t", "f"].forEach((val, i) => {
    legend.append("circle")
      .attr("cx", 350)
      .attr("cy", i * 20 - 4)
      .attr("r", 6)
      .attr("fill", colorScatter(val));

    legend.append("text")
      .attr("x", 365)
      .attr("y", i * 20 )
      .style("font-size", "13px")
      .text(`Superhost = ${val === "t" ? "true" : "false"}`);
  });


// ==============================
// BOXPLOTS CANVAS - FIXED VERSION
// ==============================
const boxSvg = d3.select("#boxplots")
  .append("svg")
  .attr("width", boxWidth + boxMargin.left + boxMargin.right)
  .attr("height", boxHeight + boxMargin.top + boxMargin.bottom)
  .append("g")
  .attr("transform", `translate(${boxMargin.left},${boxMargin.top})`);

const metrics = [
  { key: "estimated_revenue_l365d", label: "Revenue (365d)" },
  { key: "review_scores_rating", label: "Review Score Rating" },
  { key: "estimated_occupancy_l365d", label: "Occupancy (365d)" }
];

const groups = ["t", "f"];

const xMetric = d3.scaleBand()
  .domain(metrics.map(m => m.label))
  .range([0, boxWidth])
  .padding(0.25);

const xGroup = d3.scaleBand()
  .domain(groups)
  .range([0, xMetric.bandwidth()])
  .padding(0.2);

// Draw main X-axis
boxSvg.append("g")
  .attr("transform", `translate(0,${boxHeight})`)
  .call(d3.axisBottom(xMetric))
  .selectAll("text")
  .style("text-anchor", "middle")
  .style("font-size", "14px");

// X Label
boxSvg.append("text")
  .attr("x", boxWidth / 2)
  .attr("y", boxHeight + 55)
  .attr("text-anchor", "middle")
  .style("font-size", "16px")
  .text("Metrics by Superhost Status");

// Create metric groups
metrics.forEach(metric => {
  const metricGroup = boxSvg.append("g")
    .attr("transform", `translate(${xMetric(metric.label)},0)`);

  const metricValues = data.map(d => d[metric.key]).filter(d => d !== null);
  const y = d3.scaleLinear()
    .domain([d3.min(metricValues), d3.max(metricValues)])
    .nice()
    .range([boxHeight, 0]);

  // Left axis + gridlines for each metric
  metricGroup.append("g")
    .call(d3.axisLeft(y)
      .ticks(5)
      .tickSize(-xMetric.bandwidth())
    )
    .selectAll("text")
    .style("font-size", "12px");

  groups.forEach(group => {
    const groupData = data.filter(d => d.host_is_superhost === group)
      .map(d => d[metric.key])
      .sort(d3.ascending);

    if (groupData.length < 4) return;

    const q1 = d3.quantile(groupData, 0.25);
    const q2 = d3.quantile(groupData, 0.50);
    const q3 = d3.quantile(groupData, 0.75);
    const min = groupData[0];
    const max = groupData[groupData.length - 1];

    const xPos = xGroup(group);

    // Box
    metricGroup.append("rect")
      .attr("x", xPos)
      .attr("y", y(q3))
      .attr("width", xGroup.bandwidth())
      .attr("height", y(q1) - y(q3))
      .attr("fill", group === "t" ? "#f5a623" : "#4f81bd")
      .attr("opacity", 0.75);

    // Median line
    metricGroup.append("line")
      .attr("x1", xPos)
      .attr("x2", xPos + xGroup.bandwidth())
      .attr("y1", y(q2))
      .attr("y2", y(q2))
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    // Whiskers
    metricGroup.append("line")
      .attr("x1", xPos + xGroup.bandwidth() / 2)
      .attr("x2", xPos + xGroup.bandwidth() / 2)
      .attr("y1", y(min))
      .attr("y2", y(max))
      .attr("stroke", "black");
  });
}); // <--- end metrics.forEach

// No missing or extra curly brackets!

});
