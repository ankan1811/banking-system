"use client"

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const DoughnutChart = ({ accounts }: DoughnutChartProps) => {
  const safeAccounts = accounts || [];
  const accountNames = safeAccounts.map((a) => a.name);
  const balances = safeAccounts.map((a) => a.currentBalance)

  const data = {
    datasets: [
      {
        label: 'Banks',
        data: balances,
        backgroundColor: ['#8b5cf6', '#6366f1', '#22d3ee']
      }
    ],
    labels: accountNames
  }

  return <Doughnut
    data={data}
    options={{
      cutout: '65%',
      plugins: {
        legend: {
          display: false
        }
      }
    }}
  />
}

export default DoughnutChart
