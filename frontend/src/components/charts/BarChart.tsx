"use client";

import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Card } from "@/components/ui/Card";

interface BarChartProps {
  title: string;
  data: Array<{ name: string; [key: string]: string | number }>;
  dataKey: string;
  height?: number;
  color?: string;
  label?: string;
}

export function BarChart({ title, data, dataKey, height = 256, color = "#0066cc", label }: BarChartProps) {
  return (
    <Card>
      <div className="p-5">
        <h3 className="text-lg font-bold mb-4 text-gray-900">{title}</h3>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <YAxis 
                stroke="#6b7280" 
                tick={{ fill: "#6b7280", fontSize: 12 }} 
                label={label ? { value: label, angle: -90, position: "insideLeft", fill: "#6b7280" } : undefined}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }} 
              />
              <Bar dataKey={dataKey} fill={color} radius={[8, 8, 0, 0]} animationDuration={1000} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}


