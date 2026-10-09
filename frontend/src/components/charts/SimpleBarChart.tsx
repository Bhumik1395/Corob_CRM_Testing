import ReactECharts from "echarts-for-react";
import { COLORS, TOOLTIP } from "../../lib/palette";

export function SimpleBarChart({
    data,
    xKey,
    yKey,
    color = COLORS.green,
    horizontal = false,
    height = 200,
}: {
    data: Record<string, string | number>[];
    xKey: string;
    yKey: string;
    color?: string;
    horizontal?: boolean;
    height?: number;
}) {
    const categories = data.map((d) => String(d[xKey]));
    const values = data.map((d) => d[yKey]);

    const option = horizontal
        ? {
            grid: { left: 8, right: 36, top: 4, bottom: 4, containLabel: true },
            tooltip: { ...TOOLTIP, trigger: "axis", axisPointer: { type: "shadow" } },
            xAxis: { type: "value", show: false },
            yAxis: {
                type: "category",
                data: categories,
                inverse: true,
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { fontSize: 11, color: COLORS.muted },
            },
            series: [
                {
                    type: "bar",
                    data: values,
                    barWidth: 10,
                    itemStyle: { color, borderRadius: [0, 6, 6, 0] },
                    label: { show: true, position: "right", fontSize: 11, color: COLORS.ink },
                },
            ],
        }
        : {
            grid: { left: 35, right: 10, top: 25, bottom: 40 },
            tooltip: { ...TOOLTIP, trigger: "axis", axisPointer: { type: "shadow" } },
            xAxis: {
                type: "category",
                data: categories,
                axisLine: { lineStyle: { color: COLORS.grid } },
                axisTick: { show: false },
                axisLabel: { rotate: 45, fontSize: 11, color: COLORS.muted, interval: 0 },
            },
            yAxis: {
                type: "value",
                axisLabel: { fontSize: 11, color: COLORS.muted },
                splitLine: { lineStyle: { color: COLORS.grid, type: "dashed" } },
            },
            series: [
                {
                    type: "bar",
                    data: values,
                    barWidth: "60%",
                    itemStyle: { color, borderRadius: [6, 6, 0, 0] },
                    label: { show: true, position: "top", fontSize: 11, color: COLORS.ink },
                },
            ],
        };

    return <ReactECharts option={option} style={{ height }} />;
}