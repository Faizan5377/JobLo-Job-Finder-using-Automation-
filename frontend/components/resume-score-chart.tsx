"use client"

import { useEffect, useState } from "react"
import { Chart as ChartJS, ArcElement, Tooltip, Legend, type ChartData, type ChartOptions } from "chart.js"
import { Doughnut } from "react-chartjs-2"

ChartJS.register(ArcElement, Tooltip, Legend)

interface ResumeScoreChartProps {
  score: number
}

export function ResumeScoreChart({ score }: ResumeScoreChartProps) {
  const [chartData, setChartData] = useState<ChartData<"doughnut">>({
    labels: [],
    datasets: [],
  })

  const [chartOptions, setChartOptions] = useState<ChartOptions<"doughnut">>({})

  useEffect(() => {
    // Calculate the remaining portion to complete the circle
    const remaining = 10 - score

    // Set chart data
    setChartData({
      labels: ["Score", "Remaining"],
      datasets: [
        {
          data: [score, remaining],
          backgroundColor: [score < 5 ? "#ef4444" : score < 7.5 ? "#f59e0b" : "#22c55e", "#e2e8f0"],
          borderWidth: 0,
          cutout: "75%",
        },
      ],
    })

    // Set chart options
    setChartOptions({
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
        },
      },
    })
  }, [score])

  return (
    <div className="relative h-48 w-48">
      <Doughnut data={chartData} options={chartOptions} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold">{score.toFixed(1)}</div>
          <div className="text-sm text-muted-foreground">out of 10</div>
        </div>
      </div>
    </div>
  )
}

