// Cleaned-up D3 Script for Airbnb Scatterplot Only

const scatterMargin = { top: 60, right: 30, bottom: 60, left: 70 };
const scatterWidth = 800;
const scatterHeight = 450;

const tooltip = d3.select("#tooltip");

d3.csv("cleaned_listings.csv", d3.autoType).then(data => {
  // Keep only rows with all required fields
  data = data.filter(d =>
    d.calculated_host_listings_count != null &&
    d.review_scores_rating != null &&
    d.estimated_revenue_l365d != null &&
    d.host_is_superhost != null
  );

  // Remove extreme x outliers (e.g., > 150 listings) for clearer view
  const xUpper = d3.quantile(
    data.map(d => d.calculated_host_listings_count).sort(d3.ascending),
    0.98
  );
  data = data.filter(d => d.calculated_host_listings_count <= xUpper);

  const scatterSvg = d3.select("#scatter")
    .append("svg")
    .attr("viewBox", `0 0 ${scatterWidth + scatterMargin.left + scatterMargin.right} ${scatterHeight + scatterMargin.top + scatterMargin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("max-width", "100%")
    .style("height", "auto")
    .append("g")
    .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

  // X scale with padding
  const xDomain = d3.extent(data, d => d.calculated_host_listings_count);
  const xScatter = d3.scaleLinear()
    .domain([0, xDomain[1] * 1.05])
    .nice()
    .range([0, scatterWidth]);

  // Y scale focused on typical ratings (0–5 or data range)
  const yDomain = d3.extent(data, d => d.review_scores_rating);
  const yScatter = d3.scaleLinear()
    .domain([Math.max(0, yDomain[0] - 0.2), Math.min(5, yDomain[1] + 0.2)])
    .nice()
    .range([scatterHeight, 0]);

  // Bubble size (slightly smaller range)
  const sizeDomain = d3.extent(data, d => d.estimated_revenue_l365d);
  const sizeScatter = d3.scaleSqrt()
    .domain([Math.max(0, sizeDomain[0]), sizeDomain[1]])
    .range([2, 10]);

  const colorScatter = d3.scaleOrdinal()
    .domain(["t", "f"])
    .range(["#f5a623", "#4f81bd"]);

  // X axis + gridlines
  const xAxis = d3.axisBottom(xScatter).ticks(8);
  const xGrid = d3.axisBottom(xScatter)
    .ticks(8)
    .tickSize(-scatterHeight)
    .tickFormat("");

  scatterSvg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${scatterHeight})`)
    .call(xGrid)
    .selectAll("line")
    .attr("stroke", "#e0e0e0");

  scatterSvg.append("g")
    .attr("transform", `translate(0,${scatterHeight})`)
    .call(xAxis)
    .call(g => g.selectAll("text").style("font-size", "11px"));

  // Y axis + gridlines
  const yAxis = d3.axisLeft(yScatter).ticks(7);
  const yGrid = d3.axisLeft(yScatter)
    .ticks(7)
    .tickSize(-scatterWidth)
    .tickFormat("");

  scatterSvg.append("g")
    .attr("class", "grid")
    .call(yGrid)
    .selectAll("line")
    .attr("stroke", "#e0e0e0");

  scatterSvg.append("g")
    .call(yAxis)
    .call(g => g.selectAll("text").style("font-size", "11px"));

  // Axis labels
  scatterSvg.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 45)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Host Total Listings Count");

  scatterSvg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -scatterHeight / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .text("Average Review Score Rating");

  // Smaller, tighter title
  scatterSvg.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("text-anchor", "start")
    .style("font-size", "16px")
    .style("font-weight", "600")
    .text("Rating vs Host Listings (Bubble = Revenue)");

  // Points
  scatterSvg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => xScatter(d.calculated_host_listings_count))
    .attr("cy", d => yScatter(d.review_scores_rating))
    .attr("r", d => sizeScatter(d.estimated_revenue_l365d))
    .attr("fill", d => colorScatter(d.host_is_superhost))
    .attr("opacity", 0.65)
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .on("mouseover", (event, d) => {
      tooltip
        .style("display", "block")
        .html(`
          <strong>Host Listings:</strong> ${d.calculated_host_listings_count}<br>
          <strong>Rating:</strong> ${d.review_scores_rating}<br>
          <strong>Revenue (365d):</strong> $${d3.format(",.0f")(d.estimated_revenue_l365d)}<br>
          <strong>Superhost:</strong> ${d.host_is_superhost === "t" ? "Yes" : "No"}
        `)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY + "px");
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY + "px");
    })
    .on("mouseout", () => tooltip.style("display", "none"));

    // Compact legend positioned a bit farther right & up
const legend = scatterSvg.append("g")
  .attr("transform", `translate(${scatterWidth - 220}, 0)`);

// SECTION 1: Superhost color legend (left column)
const legendSuper = legend.append("g");

legendSuper.append("text")
  .attr("x", 0)
  .attr("y", -45)
  .style("font-size", "12px")
  .style("font-weight", "600")
  .text("Superhost");

const legendItems = [
  { val: "t", label: "Yes" },
  { val: "f", label: "No" }
];

legendItems.forEach((item, i) => {
  const y = -30 + i * 18;
  legendSuper.append("circle")
    .attr("cx", 4)
    .attr("cy", y)
    .attr("r", 5)
    .attr("fill", colorScatter(item.val))
    .attr("opacity", 0.9);

  legendSuper.append("text")
    .attr("x", 16)
    .attr("y", y + 3)
    .style("font-size", "11px")
    .text(item.label);
});

// SECTION 2: Revenue size legend (right column, same baseline)
const legendSize = legend.append("g")
  .attr("transform", "translate(90, 0)");

legendSize.append("text")
  .attr("x", 0)
  .attr("y", -45)
  .style("font-size", "12px")
  .style("font-weight", "600")
  .text("Revenue (365d)");

// pick nicer rounded size ticks
const sizeValues = [
  d3.quantile(sizeDomain, 0.25),
  d3.quantile(sizeDomain, 0.5),
  d3.quantile(sizeDomain, 0.9)
];

const xStart = 10;

sizeValues.forEach((val, i) => {
  const r = sizeScatter(val);
  const cx = xStart + i * 40;   // horizontal layout
  const cy = -25;

  legendSize.append("circle")
    .attr("cx", cx)
    .attr("cy", cy)
    .attr("r", r)
    .attr("fill", "#ffffff")
    .attr("stroke", "#777")
    .attr("opacity", 0.9);

  legendSize.append("text")
    .attr("x", cx)
    .attr("y", cy + r + 11)
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .text(`$${d3.format(".2s")(val)}`);
});


});
