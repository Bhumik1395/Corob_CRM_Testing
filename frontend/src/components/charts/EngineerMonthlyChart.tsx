import ReactECharts from "echarts-for-react";
import type { EngineerMonthRow } from "../../api/engineers";
import { formatMonthShort } from "../../lib/format";
import { COLORS, TOOLTIP } from "../../lib/palette";






export function EngineerMonthlyChart({
    months,
    countName,
    negativeName,
    workingDays,
    height = 260,
}: {
    months: EngineerMonthRow[];
    countName: string;
    negativeName: string;
    workingDays: number;
    height?: number;
}) {
    const posMax = Math.max(1, ...months.map((m) => m.count)) * 1.25;
    const negMax = Math.max(0, ...months.map((m) => m.negative_count)) * 1.25;
    const rightMin = negMax > 0 ? -(negMax / posMax) * workingDays : 0;

    const option = {
        grid: { left: 44, right: 40, top: 16, bottom: 26 },
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
            data: months.map((m) => formatMonthShort(m.year_month)),
            axisLine: { onZero: false, show: false },
            axisTick: { show: false },
            axisLabel: { color: COLORS.muted, fontSize: 11, margin: 10 },
        },
        yAxis: [
            {
                type: "value",
                min: -negMax,
                max: posMax,
                axisLabel: { color: COLORS.muted, fontSize: 11, formatter: (v: number) => Math.abs(Math.round(v)).toLocaleString() },
                splitLine: { lineStyle: { color: COLORS.grid, type: "dashed" } },
            },
            {
                type: "value",
                min: rightMin,
                max: workingDays,
                axisLabel: { color: COLORS.muted, fontSize: 11, formatter: (v: number) => (v < 0 ? "" : Math.round(v)) },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: countName,
                type: "bar",
                yAxisIndex: 0,
                barGap: "-100%",
                data: months.map((m) => m.count),
                barMaxWidth: 28,
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
                name: negativeName,
                type: "bar",
                yAxisIndex: 0,
                barGap: "-100%",
                data: months.map((m) => -m.negative_count),
                barMaxWidth: 28,
                itemStyle: { color: COLORS.red, borderRadius: [0, 0, 8, 8] },
                label: {
                    show: true,
                    position: "bottom",
                    fontSize: 10,
                    color: COLORS.muted,
                    formatter: (p: any) => (p.value ? Math.abs(p.value) : ""),
                },
            },
            {
                name: "Days quota met",
                type: "line",
                yAxisIndex: 1,
                data: months.map((m) => m.days_quota_met),
                symbol: "circle",
                symbolSize: 7,
                lineStyle: { color: COLORS.forest, width: 2 },
                itemStyle: { color: COLORS.forest },
            },
        ],
    };
    return <ReactECharts option={option} style={{ height }} />;
}
