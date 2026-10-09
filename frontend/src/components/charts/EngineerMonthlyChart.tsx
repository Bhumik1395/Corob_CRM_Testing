import ReactECharts from "echarts-for-react";
import type { EngineerMonthRow } from "../../api/engineers";
import { formatMonthShort } from "../../lib/format";
import { COLORS, TOOLTIP } from "../../lib/palette";

/** Bars: jobs per month (left axis). Line: days the daily quota was met (right axis). */
export function EngineerMonthlyChart({
    months,
    countName,
    workingDays,
    height = 240,
}: {
    months: EngineerMonthRow[];
    countName: string;
    workingDays: number;
    height?: number;
}) {
    const option = {
        grid: { left: 40, right: 40, top: 16, bottom: 26 },
        tooltip: { ...TOOLTIP, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(141,228,28,0.12)" } } },
        xAxis: {
            type: "category",
            data: months.map((m) => formatMonthShort(m.year_month)),
            axisLine: { lineStyle: { color: COLORS.grid } },
            axisTick: { show: false },
            axisLabel: { color: COLORS.muted, fontSize: 11 },
        },
        yAxis: [
            {
                type: "value",
                axisLabel: { color: COLORS.muted, fontSize: 11 },
                splitLine: { lineStyle: { color: COLORS.grid, type: "dashed" } },
            },
            {
                type: "value",
                min: 0,
                max: workingDays,
                axisLabel: { color: COLORS.muted, fontSize: 11 },
                splitLine: { show: false },
            },
        ],
        series: [
            {
                name: countName,
                type: "bar",
                yAxisIndex: 0,
                data: months.map((m) => m.count),
                barMaxWidth: 30,
                itemStyle: { color: COLORS.green, borderRadius: [8, 8, 0, 0] },
                emphasis: { itemStyle: { color: COLORS.lime } },
                label: { show: true, position: "top", fontSize: 10, color: COLORS.muted },
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