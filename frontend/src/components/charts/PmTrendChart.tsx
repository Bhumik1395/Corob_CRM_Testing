import ReactECharts from "echarts-for-react";
import { COLORS, TOOLTIP } from "../../lib/palette";

export interface TrendPoint {
    label: string;
    done: number;
    dispute: number;
}

export function PmTrendChart({ data, height = 250 }: { data: TrendPoint[]; height?: number }) {
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

            axisLine: { onZero: false, show: false },
            axisTick: { show: false },
            axisLabel: { color: COLORS.muted, fontSize: 11, margin: 10, rotate: data.length > 10 ? 45 : 0 },
        },
        yAxis: {
            type: "value",
            axisLabel: { color: COLORS.muted, fontSize: 11, formatter: (v: number) => Math.abs(v).toLocaleString() },
            splitLine: { lineStyle: { color: COLORS.grid, type: "dashed" } },
        },

        barGap: "-100%",
        series: [
            {
                name: "PM done",
                type: "bar",
                data: data.map((d) => d.done),
                barMaxWidth: 30,
                itemStyle: { color: COLORS.green, borderRadius: [8, 8, 0, 0] },
                emphasis: { itemStyle: { color: COLORS.lime } },
                label: { show: true, position: "top", fontSize: 10, color: COLORS.muted },
                markLine: {
                    silent: true,
                    symbol: "none",
                    label: { show: false },
                    lineStyle: { color: "#C9D1CD", width: 1, type: "solid" },
                    data: [{ yAxis: 0 }],
                },
            },
            {
                name: "Dispute",
                type: "bar",
                data: data.map((d) => -d.dispute),
                barMaxWidth: 30,
                itemStyle: { color: COLORS.red, borderRadius: [0, 0, 8, 8] },
                label: {
                    show: true,
                    position: "bottom",
                    fontSize: 10,
                    color: COLORS.muted,
                    formatter: (p: any) => Math.abs(p.value),
                },
            },
        ],
    };
    return <ReactECharts option={option} style={{ height }} />;
}
