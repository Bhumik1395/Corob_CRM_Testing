import ReactECharts from "echarts-for-react";
import { COLORS, TOOLTIP } from "../../lib/palette";

export interface TrendPoint {
    label: string;
    value: number;
}

export function PmTrendChart({
    data,
    seriesName = "PMs",
    height = 250,
}: {
    data: TrendPoint[];
    seriesName?: string;
    height?: number;
}) {
    const option = {
        grid: { left: 44, right: 8, top: 16, bottom: 28 },
        tooltip: {
            ...TOOLTIP,
            trigger: "axis",
            axisPointer: { type: "shadow", shadowStyle: { color: "rgba(141,228,28,0.12)" } },
            formatter: (params: any[]) => {
                const rows = params
                    .map(
                        (p) =>
                            `<div style="display:flex;align-items:center;justify-content:space-between;gap:18px">
                                <span>${p.marker}${p.seriesName}</span><b>${Math.abs(p.value).toLocaleString()}</b>
                             </div>`
                    )
                    .join("");
                return `<div style="color:${COLORS.muted};margin-bottom:4px">${params[0].axisValueLabel}</div>${rows}`;
            },
        },
        xAxis: {
            type: "category",
            data: data.map((d) => d.label),
            // Keep period labels at the bottom of the chart, not on the zero line.
            axisLine: { onZero: false, show: false },
            axisTick: { show: false },
            axisLabel: { color: COLORS.muted, fontSize: 11, margin: 10, rotate: data.length > 10 ? 45 : 0 },
        },
        yAxis: {
            type: "value",
            axisLabel: { color: COLORS.muted, fontSize: 11, formatter: (v: number) => v.toLocaleString() },
            splitLine: { lineStyle: { color: COLORS.grid, type: "dashed" } },
        },
        series: [
            {
                name: seriesName,
                type: "bar",
                data: data.map((d) => d.value),
                barMaxWidth: 30,
                itemStyle: { color: COLORS.green, borderRadius: [8, 8, 0, 0] },
                emphasis: { itemStyle: { color: COLORS.lime } },
                label: { show: true, position: "top", fontSize: 10, color: COLORS.muted },
            },
        ],
    };
    return <ReactECharts option={option} style={{ height }} />;
}
