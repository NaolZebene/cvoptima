import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ScoreChart = ({ data, options: customOptions }) => {
  // Default options
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 6,
        displayColors: false,
        callbacks: {
          label: (context) => {
            return `Score: ${context.parsed.y}/100`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12,
          },
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12,
          },
          callback: (value) => `${value}/100`,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'nearest',
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
        backgroundColor: '#3b82f6',
        borderColor: '#fff',
        borderWidth: 2,
      },
      line: {
        tension: 0.4,
        borderWidth: 2,
      },
    },
  };

  // Default data if none provided
  const defaultData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
    datasets: [
      {
        label: 'ATS Score',
        data: [65, 72, 78, 82, 85, 88],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
      },
    ],
  };

  // Merge custom options with defaults
  const options = {
    ...defaultOptions,
    ...customOptions,
    plugins: {
      ...defaultOptions.plugins,
      ...(customOptions?.plugins || {}),
    },
  };

  return (
    <div className="w-full h-full">
      <Line data={data || defaultData} options={options} />
    </div>
  );
};

// Additional chart components
export const ScoreDistributionChart = ({ scores }) => {
  const data = {
    labels: ['0-20', '21-40', '41-60', '61-80', '81-100'],
    datasets: [
      {
        label: 'Number of CVs',
        data: scores || [2, 5, 12, 25, 8],
        backgroundColor: [
          'rgba(239, 68, 68, 0.2)',
          'rgba(245, 158, 11, 0.2)',
          'rgba(59, 130, 246, 0.2)',
          'rgba(16, 185, 129, 0.2)',
          'rgba(139, 92, 246, 0.2)',
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(139, 92, 246)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.parsed.y} CVs`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="w-full h-64">
      <Line data={data} options={options} />
    </div>
  );
};

export const CategoryScoreChart = ({ categories }) => {
  const data = {
    labels: categories?.map(c => c.name) || ['Keywords', 'Formatting', 'Sections', 'Readability', 'Action Verbs'],
    datasets: [
      {
        label: 'Score',
        data: categories?.map(c => c.score) || [28, 9, 22, 8, 7],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.parsed.x}/30`;
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 30,
        ticks: {
          callback: (value) => `${value}/30`,
        },
      },
    },
  };

  return (
    <div className="w-full h-64">
      <Line data={data} options={options} />
    </div>
  );
};

export const ImprovementChart = ({ improvements }) => {
  const data = {
    labels: improvements?.map(i => i.date) || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Score Improvement',
        data: improvements?.map(i => i.improvement) || [5, 3, 7, 4, 6, 8],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `Improvement: +${context.parsed.y} points`;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => `+${value}`,
        },
      },
    },
  };

  return (
    <div className="w-full h-64">
      <Line data={data} options={options} />
    </div>
  );
};

export default ScoreChart;