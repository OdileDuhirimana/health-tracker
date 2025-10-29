"use client";

import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from "recharts";

// Export with different name to avoid conflict
import { Card } from "@/components/ui/Card";

interface PieChartData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface PieChartProps {
  title: string;
  data: PieChartData[];
  height?: number;
}

export function PieChart({ title, data, height = 256 }: PieChartProps) {
  return (
    <Card>
      <div className="p-5">
        <h3 className="text-lg font-bold mb-4 text-gray-900">{title}</h3>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                animationDuration={1000}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} 
              />
              <Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

