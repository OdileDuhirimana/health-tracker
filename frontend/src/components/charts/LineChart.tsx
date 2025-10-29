"use client";

import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

// Export with different name to avoid conflict
import { Card } from "@/components/ui/Card";

interface LineChartProps {
  title: string;
  data: Array<{ name: string; [key: string]: string | number }>;
  dataKey: string;
  height?: number;
  color?: string;
}

export function LineChart({ title, data, dataKey, height = 256, color = "#0066cc" }: LineChartProps) {
  return (
    <Card>
      <div className="p-5">
        <h3 className="text-lg font-bold mb-4 text-gray-900">{title}</h3>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <YAxis stroke="#6b7280" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} 
              />
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke={color} 
                strokeWidth={3} 
                dot={{ r: 5, fill: color }} 
                animationDuration={1000} 
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

