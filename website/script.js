// Cleaned-up D3 Script for Airbnb Scatterplot Only + Interactive Legend + Zoom

const scatterMargin = { top: 60, right: 30, bottom: 60, left: 70 };
const scatterWidth = 800;
const scatterHeight = 450;

const tooltip = d3.select("#tooltip");

// STORE LEGEND STATE
let activeSuperhosts = { t: true, f: true };

d3.csv("cleaned_listings.csv", d3.autoType).then(data => {
  // Keep only rows with required fields
  data = data.filter(d =>
    d.calculated_host_listings_count != null &&
    d.review_scores_rating != null &&
    d.estimated_revenue_l365d != null &&
    d.host_is_superhost != null
  );

  // Remove extreme x outliers
  const xUpper = d3.quantile(
    data.map(d => d.calculated_host_listings_count).sort(d3.ascending),
    0.98
  );
  data = data.filter(d => d.calculated_host_listings_count <= xUpper);

  const scatterSvg = d3.select("#scatter")
    .append("svg")
    .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
    .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
    .append("g")
    .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

  // X scale
  const xDomain = d3.extent(data, d => d.calculated_host_listings_count);
  const xScatter = d3.scaleLinear()
    .domain([0, xDomain[1] * 1.05])
    .nice()
    .range([0, scatterWidth]);

  // Y scale
  const yDomain = d3.extent(data, d => d.review_scores_rating);
  const yScatter = d3.scaleLinear()
    .domain([Math.max(0, yDomain[0] - 0.2), Math.min(5, yDomain[1] + 0.2)])
    .nice()
    .range([scatterHeight, 0]);

  // Bubble size
  const sizeDomain = d3.extent(data, d => d.estimated_revenue_l365d);
  const sizeScatter = d3.scaleSqrt()
    .domain([Math.max(0, sizeDomain[0]), sizeDomain[1]])
    .range([2, 10]);

  const colorScatter = d3.scaleOrdinal()
    .domain(["t", "f"])
    .range(["#f5a623", "#4f81bd"]);

  // X axis + grid
  const xAxis = d3.axisBottom(xScatter).ticks(8);
  const xGrid = d3.axisBottom(xScatter)
    .ticks(8)
    .tickSize(-scatterHeight)
    .tickFormat("");

  scatterSvg.append("g")
    .attr("class", "x-grid")
    .attr("transform", `translate(0,${scatterHeight})`)
    .call(xGrid)
    .selectAll("line")
    .attr("stroke", "#e0e0e0");

  scatterSvg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${scatterHeight})`)
    .call(xAxis)
    .call(g => g.selectAll("text").style("font-size", "11px"));

  // Y axis + grid
  const yAxis = d3.axisLeft(yScatter).ticks(7);
  const yGrid = d3.axisLeft(yScatter)
    .ticks(7)
    .tickSize(-scatterWidth)
    .tickFormat("");

  scatterSvg.append("g")
    .attr("class", "y-grid")
    .call(yGrid)
    .selectAll("line")
    .attr("stroke", "#e0e0e0");

  scatterSvg.append("g")
    .attr("class", "y-axis")
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

  // Title
  scatterSvg.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("text-anchor", "start")
    .style("font-size", "16px")
    .style("font-weight", "600")
    .text("Rating vs Host Listings (Bubble = Revenue)");

  // POINTS (store reference!)
  const circles = scatterSvg.selectAll("circle")
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
      tooltip.style("display", "block").html(`
        <strong>Host Listings:</strong> ${d.calculated_host_listings_count}<br>
        <strong>Rating:</strong> ${d.review_scores_rating}<br>
        <strong>Revenue (365d):</strong> $${d3.format(",.0f")(d.estimated_revenue_l365d)}<br>
        <strong>Superhost:</strong> ${d.host_is_superhost === "t" ? "Yes" : "No"}
      `)
      .style("left", event.pageX + 15 + "px")
      .style("top", event.pageY + "px");
    })
    .on("mousemove", (event) => {
      tooltip.style("left", event.pageX + 15 + "px")
             .style("top", event.pageY + "px");
    })
    .on("mouseout", () => tooltip.style("display", "none"));

  // FILTER LOGIC
  function updateVisibility() {
    circles.style("display", d =>
      activeSuperhosts[d.host_is_superhost] ? "block" : "none"
    );
  }

  // Legend container
  const legend = scatterSvg.append("g")
    .attr("transform", `translate(${scatterWidth - 220}, 0)`);

  // --- Superhost legend (left side) ---
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

    const row = legendSuper.append("g")
      .attr("transform", `translate(0,${y})`)
      .style("cursor", "pointer")
      .on("click", () => {
        activeSuperhosts[item.val] = !activeSuperhosts[item.val];

        row.select("circle")
          .attr("opacity", activeSuperhosts[item.val] ? 0.9 : 0.25);

        row.select("text")
          .style("opacity", activeSuperhosts[item.val] ? 1.0 : 0.3);

        updateVisibility();
      });

    row.append("circle")
      .attr("cx", 4)
      .attr("cy", 0)
      .attr("r", 5)
      .attr("fill", colorScatter(item.val))
      .attr("opacity", 0.9);

    row.append("text")
      .attr("x", 16)
      .attr("y", 3)
      .style("font-size", "11px")
      .text(item.label);
  });

  // Revenue size legend (right side)
  const legendSize = legend.append("g")
    .attr("transform", "translate(90, 0)");

  legendSize.append("text")
    .attr("x", 0)
    .attr("y", -45)
    .style("font-size", "12px")
    .style("font-weight", "600")
    .text("Revenue (365d)");

  const sizeValues = [
    d3.quantile(sizeDomain, 0.25),
    d3.quantile(sizeDomain, 0.5),
    d3.quantile(sizeDomain, 0.9)
  ];

  const xStart = 10;

  sizeValues.forEach((val, i) => {
    const r = sizeScatter(val);
    const cx = xStart + i * 40;
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

  // ======================
  // ZOOM / PAN BEGINS HERE
  // ======================
  const zoom = d3.zoom()
    .scaleExtent([0.8, 20])
    .extent([[0, 0], [scatterWidth, scatterHeight]])
    .on("zoom", zoomed);

  scatterSvg.call(zoom);

  function zoomed(event) {
    const transform = event.transform;

    // Rescale axes
    const newX = transform.rescaleX(xScatter);
    const newY = transform.rescaleY(yScatter);

    // Update grid lines
    scatterSvg.select(".x-grid").call(xGrid.scale(newX));
    scatterSvg.select(".y-grid").call(yGrid.scale(newX));

    // Update axes
    scatterSvg.select(".x-axis").call(xAxis.scale(newX));
    scatterSvg.select(".y-axis").call(yAxis.scale(newY));

    // Update circle positions
    circles
      .attr("cx", d => newX(d.calculated_host_listings_count))
      .attr("cy", d => newY(d.review_scores_rating));
  }
});
