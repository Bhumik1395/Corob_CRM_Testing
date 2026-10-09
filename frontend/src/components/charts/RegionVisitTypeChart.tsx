import ReactECharts from "echarts-for-react";
import { COLORS, TOOLTIP } from "../../lib/palette";

export function RegionVisitTypeChart({
    data,
    height = 230,
}: {
    data: { region: string; Physical: number; Online: number; Unknown: number }[];
    height?: number;
}) {
    const option = {
        grid: { left: 36, right: 8, top: 34, bottom: 26 },
        legend: {
            top: 0,
            right: 0,
            icon: "circle",
            itemWidth: 8,
            itemHeight: 8,
            itemGap: 14,
            textStyle: { fontSize: 11, color: COLORS.muted },
        },
        tooltip: { ...TOOLTIP, trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(141,228,28,0.12)" } } },
        xAxis: {
            type: "category",
            data: data.map((d) => d.region),
            axisLine: { lineStyle: { color: COLORS.grid } },
            axisTick: { show: false },
            axisLabel: { fontSize: 11, color: COLORS.muted, interval: 0 },
        },
        yAxis: {
            type: "value",
            axisLabel: { fontSize: 11, color: COLORS.muted },
            splitLine: { lineStyle: { color: COLORS.grid, type: "dashed" } },
        },
        series: [
            {
                name: "Physical",
                type: "bar",
                data: data.map((d) => d.Physical),
                barMaxWidth: 20,
                itemStyle: { color: COLORS.green, borderRadius: [6, 6, 0, 0] },
            },
            {
                name: "Online",
                type: "bar",
                data: data.map((d) => d.Online),
                barMaxWidth: 20,
                itemStyle: { color: COLORS.forest, borderRadius: [6, 6, 0, 0] },
            },
        ],
    };
    return <ReactECharts option={option} style={{ height }} />;
}