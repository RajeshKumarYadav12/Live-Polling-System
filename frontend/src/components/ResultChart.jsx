import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

/**
 * ResultChart Component
 * Displays poll results as a bar chart
 */
function ResultChart({ results, totalResponses }) {
  if (!results || results.length === 0) {
    return (
      <div className="empty-state">
        <p>No results available yet</p>
      </div>
    );
  }

  // Prepare data for chart
  const chartData = results.map((result, index) => ({
    name: `Option ${index + 1}`,
    option: result.text,
    votes: result.votes,
    percentage:
      totalResponses > 0
        ? ((result.votes / totalResponses) * 100).toFixed(1)
        : 0,
  }));

  // Color palette for bars
  const COLORS = [
    "#7765DA",
    "#5767D0",
    "#4F0DCE",
    "#9b8ae0",
    "#6b5bd0",
    "#8b7ae0",
  ];

  return (
    <div className="card">
      <h2 className="card-title">Live Results</h2>

      {/* Total Responses */}
      <div
        style={{
          background: "var(--neutral-light)",
          padding: "1rem",
          borderRadius: "var(--radius-sm)",
          marginBottom: "2rem",
          textAlign: "center",
          fontWeight: 600,
        }}
      >
        Total Responses:{" "}
        <span style={{ color: "var(--primary-vibrant)", fontSize: "1.2rem" }}>
          {totalResponses}
        </span>
      </div>

      {/* Bar Chart */}
      <div style={{ marginBottom: "2rem" }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div
                      style={{
                        background: "white",
                        border: "2px solid var(--primary-vibrant)",
                        padding: "1rem",
                        borderRadius: "var(--radius-sm)",
                        boxShadow: "var(--shadow-md)",
                      }}
                    >
                      <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                        {payload[0].payload.option}
                      </p>
                      <p style={{ color: "var(--primary-vibrant)" }}>
                        Votes: {payload[0].value}
                      </p>
                      <p style={{ color: "var(--neutral-gray)" }}>
                        {payload[0].payload.percentage}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Results List */}
      <div className="results-container">
        {results.map((result, index) => (
          <div key={index} className="result-item">
            <div className="result-header">
              <span className="result-option">{result.text}</span>
              <span className="result-votes">
                {result.votes} votes (
                {totalResponses > 0
                  ? ((result.votes / totalResponses) * 100).toFixed(1)
                  : 0}
                %)
              </span>
            </div>
            <div className="result-bar">
              <div
                className="result-bar-fill"
                style={{
                  width: `${
                    totalResponses > 0
                      ? (result.votes / totalResponses) * 100
                      : 0
                  }%`,
                  background: COLORS[index % COLORS.length],
                }}
              >
                {result.votes > 0 && `${result.votes}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResultChart;
