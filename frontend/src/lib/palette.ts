export const COLORS = {
    green: "#2FA84F",
    forest: "#164A38",
    lime: "#8DE41C",
    red: "#D32337",
    ink: "#0E1F19",
    muted: "#66756E",
    grid: "#E6E9E7",
} as const;

export const TOOLTIP = {
    backgroundColor: "#ffffff",
    borderColor: COLORS.grid,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: COLORS.ink, fontSize: 12, fontFamily: "Poppins, system-ui, sans-serif" },
    extraCssText: "box-shadow: 0 6px 20px rgba(14,31,25,0.10); border-radius: 12px;",
} as const;